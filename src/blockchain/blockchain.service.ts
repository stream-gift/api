import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DonationService } from '../donation/donation.service';
import {
  DonationStatus,
  StreamerWithdrawal,
  StreamerWithdrawalStatus,
} from '@prisma/client';
import { WalletService } from 'src/wallet/wallet.service';
import { CoinBalance, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Cron, CronExpression } from '@nestjs/schedule';
import { parseUnits } from 'src/common/utils/bigints';
import { MIST_PER_SUI } from 'src/common/constants';

type AccountActivity = {
  digest: string;
  type: string;
  gasFee: string;
  status: string;
  sender: string;
  timestampMs: number;
  interactAddresses: InteractAddresses;
  coinChanges: CoinChanges;
  nftChanges: NFTChanges;
  nextPageCursor: number;
};

type NFTChanges = {
  objectId: string;
  objectType: string;
  marketPlace: string;
  imageURL: string;
  name: string;
  packageId: string;
  amount: string;
  price: string;
};

type CoinChanges = {
  amount: string;
  coinAddress: string;
  symbol: string;
  decimal: string;
  logo: string;
};
type InteractAddresses = {
  address: string;
  type: string;
  name: string;
  logo: string;
};
@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);

  private client: SuiClient;
  private subscriptions: Map<string, () => void> = new Map();
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => DonationService))
    private donationService: DonationService,
    private walletService: WalletService,
  ) {
    const suiHttpEndpoint = this.configService.get<string>('SUI_HTTP_ENDPOINT');

    this.client = new SuiClient({
      url: suiHttpEndpoint,
    });
  }

  async onModuleInit() {
    await this.startListeningToAllAddresses();
  }

  async onModuleDestroy() {
    for (const address of this.subscriptions.keys())
      this.stopListeningToAddress(address);
  }

  private async startListeningToAllAddresses() {
    const addresses = await this.prisma.address.findMany({
      where: { lockedUntil: { gt: new Date() } },
    });

    for (const address of addresses) {
      // maybe call this on an interval for lockedUntil time
      await this.listenToAddress(address.address);
    }
  }

  balanceWatcher({
    address,
    onBalance,
  }: {
    address: string;
    onBalance: (coinBalance: CoinBalance) => unknown;
  }) {
    let interval = undefined;

    interval = setInterval(() => {
      this.client.getBalance({ owner: address }).then((c) => {
        if (interval) onBalance(c);
      });
    }, 5000);

    this.client.getBalance({ owner: address }).then((c) => {
      if (interval) onBalance(c);
    });

    return () => {
      if (interval) clearInterval(interval);
      interval = undefined;
    };
  }

  async listenToAddress(address: string) {
    if (this.subscriptions.has(address)) {
      this.logger.log(`Already listening to address: ${address}`);
      return;
    }

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
      return;
    }

    let initalBal = await this.client.getBalance({ owner: address });
    const startBalance = parseUnits(initalBal.totalBalance, 0);

    const cleanSub = this.balanceWatcher({
      address,
      onBalance: async (coinBalance: CoinBalance) => {
        this.logger.log(`Balance change for detected for address: ${address}`);
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
          this.stopListeningToAddress(address);
          return;
        }

        const balanceChange =
          parseUnits(coinBalance.totalBalance, 0) - startBalance;

        if (balanceChange >= BigInt(Math.floor(donation.amountAtomic))) {
          this.stopListeningToAddress(address);
          this.logger.log(
            `Donation ${donation.id} found for address: ${address}`,
          );
          this.logger.log(`Donation ${donation.id} is valid. Processing...`);

          // const senderDomainName = await this.getDomainNameFromAddress(senderAddress);
          await this.donationService.processDonation(
            donation.id,
            '', // transactionHash,
            '', // senderAddress,
            '', // senderDomainName,
          );
        }
      },
    });

    this.subscriptions.set(address, cleanSub);
    this.logger.log(`Started listening to address: ${address}`);
  }

  stopListeningToAddress(address: string) {
    this.subscriptions.get(address)();
    this.subscriptions.delete(address);
    this.logger.log(`Stopped listening to address: ${address}`);
  }

  async getDomainNameFromAddress(address: string) {
    const domain = await this.checkSUINS(address);

    return `${domain}.sui`;
  }

  async checkSUINS(address: string) {
    // Works only for main-net.
    const api = `https://api.blockvision.org/v2/sui/account/nfts`;
    try {
      this.logger.log(`Checking SUINS address ${address}`);
      let res = await fetch(`${api}?account=${address}`, {
        headers: {
          'x-api-key': `2oAgBR14BFpmT18cK5NpFUm1ZO2`,
        },
      });
      if (!res.ok) console.log(res.status, res.statusText);
      res = await res.json(); // @ts-ignore
      console.log(`checkSUINS (${address}):`, res?.result.data); //@ts-ignore
      const nfts: CollectionItem[] = res?.result.data; //@ts-ignore
      const suins_index = nfts.findIndex(
        (nft) =>
          nft.collection ==
          `0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::suins_registration::SuinsRegistration`,
      );

      if (suins_index > -1) return nfts[suins_index];
    } catch (error) {
      //@ts-ignore
      console.log(error?.message);
    }
  }
  async initiateWithdrawal(withdrawal: StreamerWithdrawal) {
    // Get sender wallet
    const addresses = await this.prisma.address.findMany();
    let senderAddress: string | undefined = undefined;

    for (const address of addresses) {
      const balance = await this.client.getBalance({ owner: address.address });
      const balanceInSui = Number(balance.totalBalance) / MIST_PER_SUI;
      if (balanceInSui >= withdrawal.amountFloat) {
        senderAddress = address.address;
        break;
      }
    }

    if (!senderAddress) {
      await this.prisma.streamerWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'FAILED' },
      });
      throw new Error('No sender address found');
    }

    console.log(withdrawal);

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [withdrawal.amountAtomic]);
    tx.transferObjects([coin], withdrawal.address);

    const signer =
      await this.walletService.getWalletKeypairFromAddress(senderAddress);
    const signed = await this.client.signAndExecuteTransaction({
      signer,
      transaction: tx,
    });
    const complete = await this.client.waitForTransaction({
      digest: signed.digest,
    });

    await this.prisma.streamerWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: StreamerWithdrawalStatus.SENT,
        transactionHash: complete.digest,
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSentWithdrawals() {
    const withdrawals = await this.prisma.streamerWithdrawal.findMany({
      where: { status: StreamerWithdrawalStatus.SENT },
    });

    for (const withdrawal of withdrawals) {
      const transaction = await this.client.waitForTransaction({
        digest: withdrawal.transactionHash,
      });

      if (!transaction) {
        continue;
      }

      // Withdrawal TX Failed
      if (transaction.errors) {
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
