import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, DonationStatus } from '@prisma/client';
import { CreateDonationDto } from './dto/create-donation.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { WAIT_TIME_FOR_DONATION_IN_SECONDS } from 'src/common/constants';
import { TransactionListenerService } from 'src/transaction/transaction-listener.service';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { cleanText } from 'src/common/utils/profanity';

@Injectable()
export class DonationService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    @Inject(forwardRef(() => TransactionListenerService))
    private transactionListenerService: TransactionListenerService,
  ) {}

  async donate({
    message,
    name,
    amount,
    username,
    currency,
  }: CreateDonationDto) {
    const streamer = await this.prisma.streamer.findFirst({
      where: { username },
    });

    if (!streamer) {
      throw new NotFoundException('Streamer not found');
    }

    let address = await this.prisma.address.findFirst({
      where: {
        OR: [
          { isLocked: false },
          {
            lockedUntil: {
              lt: new Date(),
            },
          },
        ],
      },
    });

    if (!address) {
      address = await this.walletService.createWallet();
    }

    return this.prisma.$transaction(async (prisma) => {
      const donation = await prisma.donation.create({
        data: {
          message: cleanText(message),
          name,
          currency,
          amount: amount * LAMPORTS_PER_SOL,
          amountFloat: amount,
          amountAtomic: amount * LAMPORTS_PER_SOL,
          amountUsd: Math.floor(amount * 13070),
          streamerId: streamer.id,
          addressId: address.id,
          status: DonationStatus.PENDING, // Set initial status
        },
      });

      await prisma.address.update({
        where: { id: address.id },
        data: {
          isLocked: true,
          lockedUntil: new Date(
            Date.now() + WAIT_TIME_FOR_DONATION_IN_SECONDS * 1000,
          ),
        },
      });

      this.transactionListenerService.listenToAddress(address.address);

      return {
        donation,
        address: { address: address.address, currency: address.currency },
      };
    });
  }

  async getDonation(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: { address: true },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    return { donation };
  }

  async getDonationEvents(token: string, since: string) {
    const streamer = await this.prisma.streamerToken.findFirst({
      where: { token },
    });

    if (!streamer) {
      throw new NotFoundException('Streamer not found');
    }

    return this.prisma.donation.findMany({
      where: {
        streamerId: streamer.streamerId,
        status: DonationStatus.COMPLETED,
        updatedAt: {
          gt: new Date(parseInt(since)),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processDonation(
    donationId: string,
    transactionHash: string,
    transactionSender: string,
    transactionSenderDomainName: string | null,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
      });

      if (!donation) {
        throw new NotFoundException('Donation not found');
      }

      await prisma.streamerBalance.update({
        where: {
          streamerId_currency: {
            streamerId: donation.streamerId,
            currency: Currency.SOL,
          },
        },
        data: { balance: { increment: donation.amount } },
      });

      await prisma.address.update({
        where: { id: donation.addressId },
        data: { isLocked: false, lockedUntil: null },
      });

      return prisma.donation.update({
        where: { id: donationId },
        data: {
          status: DonationStatus.COMPLETED,
          transactionHash,
          transactionSender,
          transactionSenderDomainName,
        },
      });
    });
  }
}
