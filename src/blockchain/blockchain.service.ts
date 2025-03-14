import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getAllDomains, reverseLookup } from '@bonfida/spl-name-service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DonationService } from '../donation/donation.service';
import {
  DonationStatus,
  StreamerWithdrawal,
  StreamerWithdrawalStatus,
} from '@prisma/client';
import { SOLANA_COMMITMENT } from 'src/common/constants';
import { WalletService } from 'src/wallet/wallet.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);

  private solanaConnection: Connection;
  private sonicConnection: Connection;

  private subscriptions: Map<string, { solana: number; sonic: number }> =
    new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => DonationService))
    private donationService: DonationService,
    private walletService: WalletService,
  ) {
    const solanaWsEndpoint =
      this.configService.get<string>('SOLANA_WS_ENDPOINT');
    const solanaHttpEndpoint = this.configService.get<string>(
      'SOLANA_HTTP_ENDPOINT',
    );

    this.solanaConnection = new Connection(solanaHttpEndpoint, {
      wsEndpoint: solanaWsEndpoint,
    });

    const sonicWsEndpoint = this.configService.get<string>(
      'SONIC_L2_WS_ENDPOINT',
    );
    const sonicHttpEndpoint = this.configService.get<string>(
      'SONIC_L2_HTTP_ENDPOINT',
    );

    this.sonicConnection = new Connection(sonicHttpEndpoint, {
      wsEndpoint: sonicWsEndpoint,
    });
  }

  async onModuleInit() {
    await this.startListeningToAllAddresses();
  }

  async onModuleDestroy() {
    for (const address of this.subscriptions.keys()) {
      await this.stopListeningToAddress(address);
    }
  }

  private async startListeningToAllAddresses() {
    const addresses = await this.prisma.address.findMany({
      where: { lockedUntil: { gt: new Date() } },
    });

    for (const address of addresses) {
      await this.listenToAddress(address.address);
    }
  }

  async listenToAddress(address: string) {
    if (this.subscriptions.has(address)) {
      this.logger.log(`Already listening to address: ${address}`);
      return;
    }

    const publicKey = new PublicKey(address);

    const handleAccountChange = async (
      connection: Connection,
      newAccountInfo: any,
      context: any,
    ) => {
      this.logger.log(`Transaction detected for address: ${address}`);

      const newBalanceLamports = newAccountInfo.lamports;
      const newBalance = newBalanceLamports / LAMPORTS_PER_SOL;

      const signatures = await connection.getSignaturesForAddress(
        publicKey,
        {},
        SOLANA_COMMITMENT,
      );
      const transactionHash = signatures[0].signature;

      const transaction = await connection.getTransaction(transactionHash, {
        commitment: SOLANA_COMMITMENT,
        maxSupportedTransactionVersion: 0,
      });

      const preBalance = transaction.meta.preBalances[1];
      const postBalance = transaction.meta.postBalances[1];

      const amountLamports = postBalance - preBalance;
      const amount = amountLamports / LAMPORTS_PER_SOL;

      const sender = transaction.transaction.message.staticAccountKeys[0];
      const senderAddress = sender.toBase58();

      this.logger.log(
        `Received ${amount} SOL at ${address} from ${senderAddress}! Total Balance: ${newBalance} SOL`,
      );

      // Process the donation
      const donation = await this.prisma.donation.findFirst({
        where: {
          address: { address },
          status: DonationStatus.PENDING,
          pendingUntil: {
            gte: new Date(),
          },
        },
      });

      if (!donation) {
        this.logger.log(
          `No pending donation found for address: ${address}, returning.`,
        );
        await this.stopListeningToAddress(address);
        return;
      } else {
        this.logger.log(
          `Donation ${donation.id} found for address: ${address}`,
        );

        if (amountLamports < donation.amountAtomic) {
          await this.prisma.donation.update({
            where: { id: donation.id },
            data: {
              status: DonationStatus.FAILED,
              transactionHash,
              transactionSender: senderAddress,
            },
          });

          await this.prisma.address.update({
            where: { address },
            data: { lockedUntil: null },
          });

          this.logger.error(
            `Donation ${donation.id} failed due to lower amount than expected. Expected ${donation.amountFloat} SOL, received ${amount} SOL.`,
          );
        } else {
          this.logger.log(`Donation ${donation.id} is valid. Processing...`);

          const senderDomainName =
            await this.getDomainNameFromAddress(senderAddress);

          await this.donationService.processDonation(
            donation.id,
            transactionHash,
            senderAddress,
            senderDomainName,
          );
        }

        await this.stopListeningToAddress(address);
      }
    };

    const solanaSubscriptionId = this.solanaConnection.onAccountChange(
      publicKey,
      (newAccountInfo, context) =>
        handleAccountChange(this.solanaConnection, newAccountInfo, context),
      { commitment: SOLANA_COMMITMENT },
    );

    const sonicSubscriptionId = this.sonicConnection.onAccountChange(
      publicKey,
      (newAccountInfo, context) =>
        handleAccountChange(this.sonicConnection, newAccountInfo, context),
      { commitment: SOLANA_COMMITMENT },
    );

    this.subscriptions.set(address, {
      solana: solanaSubscriptionId,
      sonic: sonicSubscriptionId,
    });
    this.logger.log(`Started listening to address: ${address}`);
  }

  async startListeningToAddress(address: string) {
    return this.listenToAddress(address);
  }

  async stopListeningToAddress(address: string) {
    const subscriptionIds = this.subscriptions.get(address);
    if (subscriptionIds !== undefined) {
      await this.solanaConnection.removeAccountChangeListener(
        subscriptionIds.solana,
      );
      await this.sonicConnection.removeAccountChangeListener(
        subscriptionIds.sonic,
      );
      this.subscriptions.delete(address);
      this.logger.log(`Stopped listening to address: ${address}`);
    }
  }

  async getDomainNameFromAddress(address: string) {
    const mainnetConnection = this.configService.get<string>(
      'SOLANA_MAINNET_HTTP_ENDPOINT',
    )
      ? new Connection(
          this.configService.get<string>('SOLANA_MAINNET_HTTP_ENDPOINT'),
        )
      : this.solanaConnection;

    const ownerWallet = new PublicKey(address);
    const allDomainKeys = await getAllDomains(mainnetConnection, ownerWallet);

    if (allDomainKeys.length === 0) {
      return null;
    }

    const [domainNameKey] = allDomainKeys;
    const domainName = await reverseLookup(mainnetConnection, domainNameKey);

    return `${domainName}.sol`
  }

  async initiateWithdrawal(withdrawal: StreamerWithdrawal) {
    // Get sender wallet
    const addresses = await this.prisma.address.findMany();

    let senderPublicKey: PublicKey;

    for (const address of addresses) {
      const publicKey = new PublicKey(address.address);
      const balance = await this.solanaConnection.getBalance(publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;

      if (balanceInSol >= withdrawal.amountFloat) {
        senderPublicKey = publicKey;
        break;
      }
    }

    if (!senderPublicKey) {
      await this.prisma.streamerWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'FAILED' },
      });
      throw new Error('No sender address found');
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: new PublicKey(withdrawal.address),
        lamports: withdrawal.amountAtomic,
      }),
    );

    const signature = await sendAndConfirmTransaction(
      this.solanaConnection,
      transaction,
      [
        await this.walletService.getWalletKeypairFromAddress(
          senderPublicKey.toBase58(),
        ),
      ],
    );

    await this.prisma.streamerWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: StreamerWithdrawalStatus.SENT,
        transactionHash: signature,
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSentWithdrawals() {
    const withdrawals = await this.prisma.streamerWithdrawal.findMany({
      where: { status: StreamerWithdrawalStatus.SENT },
    });

    for (const withdrawal of withdrawals) {
      const transaction = await this.solanaConnection.getParsedTransaction(
        withdrawal.transactionHash,
        { maxSupportedTransactionVersion: 0 },
      );

      if (!transaction) {
        continue;
      }

      // Withdrawal TX Failed
      if (transaction.meta.err) {
        this.prisma.$transaction([
          this.prisma.streamerWithdrawal.update({
            where: { id: withdrawal.id },
            data: { status: StreamerWithdrawalStatus.FAILED },
          }),
          this.prisma.streamerBalance.update({
            where: {
              streamerId_currency: {
                streamerId: withdrawal.streamerId,
                currency: withdrawal.currency,
              },
            },
            data: {
              balance: { increment: withdrawal.amountFloat },
              pending: { decrement: withdrawal.amountFloat },
            },
          }),
        ]);
      } else {
        await this.prisma.$transaction([
          this.prisma.streamerWithdrawal.update({
            where: { id: withdrawal.id },
            data: { status: StreamerWithdrawalStatus.COMPLETED },
          }),
          this.prisma.streamerBalance.update({
            where: {
              streamerId_currency: {
                streamerId: withdrawal.streamerId,
                currency: withdrawal.currency,
              },
            },
            data: {
              pending: 0,
            },
          }),
        ]);
      }
    }
  }
}
