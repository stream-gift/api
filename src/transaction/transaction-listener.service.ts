import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getDomainKeySync,
  NameRegistryState,
  getAllDomains,
  reverseLookup,
} from '@bonfida/spl-name-service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DonationService } from '../donation/donation.service';
import { DonationStatus } from '@prisma/client';
import {
  SOLANA_COMMITMENT,
  WAIT_TIME_FOR_DONATION_IN_SECONDS,
} from 'src/common/constants';

@Injectable()
export class TransactionListenerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TransactionListenerService.name);

  private connection: Connection;
  private subscriptions: Map<string, number> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => DonationService))
    private donationService: DonationService,
  ) {
    const wsEndpoint = this.configService.get<string>('SOLANA_WS_ENDPOINT');
    const httpEndpoint = this.configService.get<string>('SOLANA_HTTP_ENDPOINT');
    this.connection = new Connection(httpEndpoint, { wsEndpoint });
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
      where: { isLocked: true, lockedUntil: { gt: new Date() } },
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
    const subscriptionId = this.connection.onAccountChange(
      publicKey,
      async (newAccountInfo, context) => {
        this.logger.log(`Transaction detected for address: ${address}`);

        const newBalanceLamports = newAccountInfo.lamports;
        const newBalance = newBalanceLamports / LAMPORTS_PER_SOL;

        const signatures = await this.connection.getSignaturesForAddress(
          publicKey,
          {},
          SOLANA_COMMITMENT,
        );
        const transactionHash = signatures[0].signature;

        const transaction = await this.connection.getTransaction(
          transactionHash,
          { commitment: SOLANA_COMMITMENT, maxSupportedTransactionVersion: 0 },
        );

        const preBalances = transaction.meta.preBalances;
        const postBalances = transaction.meta.postBalances;

        const preBalance = preBalances[1];
        const postBalance = postBalances[1];

        const amountLamports = postBalance - preBalance;
        const amount = amountLamports / LAMPORTS_PER_SOL;

        const sender = transaction.transaction.message.staticAccountKeys[0];
        const senderAddress = sender.toBase58();

        this.logger.log(
          `Received ${amount} SOL at ${address} from ${senderAddress}! Total Balance: ${newBalance} SOL`,
        );

        // console.log({
        //   transactionHash,
        //   transaction: JSON.stringify(transaction, null, 2),
        //   sigs: transaction.transaction.signatures,
        //   signatures,
        //   senderAddress,
        // });

        // Process the donation
        const donation = await this.prisma.donation.findFirst({
          where: {
            address: { address },
            status: DonationStatus.PENDING,
            createdAt: {
              gt: new Date(
                Date.now() - WAIT_TIME_FOR_DONATION_IN_SECONDS * 1000,
              ),
            },
          },
        });

        console.log({ donation });

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
              data: { isLocked: false, lockedUntil: null },
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
      },
      { commitment: SOLANA_COMMITMENT },
    );

    this.subscriptions.set(address, subscriptionId);
    this.logger.log(`Started listening to address: ${address}`);
  }

  async startListeningToAddress(address: string) {
    return this.listenToAddress(address);
  }

  async stopListeningToAddress(address: string) {
    const subscriptionId = this.subscriptions.get(address);
    if (subscriptionId !== undefined) {
      await this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(address);
      this.logger.log(`Stopped listening to address: ${address}`);
    }
  }

  async getDomainNameFromAddress(address: string) {
    const ownerWallet = new PublicKey(address);
    const allDomainKeys = await getAllDomains(this.connection, ownerWallet);

    if (allDomainKeys.length === 0) {
      return null;
    }

    const [domainNameKey] = allDomainKeys;
    const domainName = await reverseLookup(this.connection, domainNameKey);

    return domainName;
  }

  /**
   * @description Manual (timely) check for pending transactions, useful if app was down
   **/
  async checkAllPendingTransactions() {
    const addresses = await this.prisma.address.findMany({
      where: { isLocked: true },
    });
  }
}
