import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DonationService } from '../donation/donation.service';
import { DonationStatus } from '@prisma/client';

@Injectable()
export class TransactionListenerService
  implements OnModuleInit, OnModuleDestroy
{
  private connection: Connection;
  private subscriptions: Map<string, number> = new Map();

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
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
    for (const [address, subscriptionId] of this.subscriptions) {
      await this.stopListeningToAddress(address);
    }
  }

  private async startListeningToAllAddresses() {
    const addresses = await this.prismaService.address.findMany({
      where: { isLocked: true },
    });

    for (const address of addresses) {
      await this.listenToAddress(address.address);
    }
  }

  async listenToAddress(address: string) {
    const publicKey = new PublicKey(address);
    const subscriptionId = this.connection.onAccountChange(
      publicKey,
      async (newAccountInfo, context) => {
        console.log(`Transaction detected for address: ${address}`);
        console.log(
          `New balance: ${newAccountInfo.lamports / LAMPORTS_PER_SOL} SOL`,
        );

        const signatures =
          await this.connection.getSignaturesForAddress(publicKey);
        const transaction = await this.connection.getTransaction(
          signatures[0].signature,
          { commitment: 'confirmed' },
        );

        console.log({ transaction });

        // Process the donation
        const donation = await this.prismaService.donation.findFirst({
          where: { address: { address }, status: DonationStatus.PENDING },
        });

        if (donation) {
          await this.donationService.processDonation(donation.id);
          await this.stopListeningToAddress(address);
        }
      },
      { commitment: 'confirmed' },
    );

    this.subscriptions.set(address, subscriptionId);
    console.log(`Started listening to address: ${address}`);
  }

  async startListeningToAddress(address: string) {
    return this.listenToAddress(address);
  }

  async stopListeningToAddress(address: string) {
    const subscriptionId = this.subscriptions.get(address);
    if (subscriptionId !== undefined) {
      await this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(address);
      console.log(`Stopped listening to address: ${address}`);
    }
  }

  /**
   * @description Manual (timely) check for pending transactions, useful if app was down
   **/
  async checkAllPendingTransactions() {
    const addresses = await this.prismaService.address.findMany({
      where: { isLocked: true },
    });
  }
}
