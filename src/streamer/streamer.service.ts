import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, StreamerWithdrawalStatus } from '@prisma/client';
import { OnboardDto } from './dto/onboard.dto';

@Injectable()
export class StreamerService {
  constructor(private prisma: PrismaService) {}

  async onboard(
    userId: string,
    {
      username,
      address,
      profileImage,
      profileBanner,
      profileColor,
    }: OnboardDto,
  ) {
    const profile = await this.prisma.streamer.findUnique({
      where: { id: userId },
    });

    if (profile) {
      throw new BadRequestException('Already onboarded!');
    }

    return this.prisma.$transaction(async (prisma) => {
      const streamer = await prisma.streamer.create({
        data: {
          id: userId,
          username,
          profileImage,
          profileBanner,
          profileColor,
        },
      });

      await prisma.streamerBalance.create({
        data: {
          streamerId: streamer.id,
          balance: 0,
          pending: 0,
          currency: Currency.SOL,
        },
      });

      await prisma.settings.create({
        data: {
          streamerId: streamer.id,
        },
      });

      await prisma.streamerAddress.create({
        data: {
          streamerId: streamer.id,
          address,
          currency: Currency.SOL,
        },
      });

      return streamer;
    });
  }

  async getProfile(username: string) {
    return this.prisma.streamer.findFirst({
      where: {
        OR: [{ username }, { id: username }],
      },
      select: {
        id: true,
        username: true,
        profileImage: true,
        profileBanner: true,
        profileColor: true,
      },
    });
  }

  async checkUsername(username: string) {
    return this.prisma.streamer
      .findUnique({
        where: { username },
      })
      .then((streamer) => !!streamer);
  }

  async getSettings(streamerId: string) {
    return this.prisma.settings.findUnique({
      where: { streamerId },
    });
  }

  async setSettings(streamerId: string, settings: any) {
    return this.prisma.settings.upsert({
      where: { streamerId },
      update: settings,
      create: { ...settings, streamerId },
    });
  }

  async getAddresses(streamerId: string) {
    return this.prisma.streamerAddress.findMany({
      where: { streamerId },
    });
  }

  async addAddress(streamerId: string, address: string, currency: Currency) {
    return this.prisma.streamerAddress.create({
      data: { streamerId, address, currency },
    });
  }

  async getDashboard(streamerId: string) {
    const [donations, withdrawals, balances] = await Promise.all([
      this.prisma.donation.findMany({ where: { streamerId } }),
      this.prisma.streamerWithdrawal.findMany({ where: { streamerId } }),
      this.prisma.streamerBalance.findMany({ where: { streamerId } }),
    ]);

    return { donations, withdrawals, balances };
  }

  async getDonations(streamerId: string) {
    return this.prisma.donation.findMany({
      where: { streamerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBalances(streamerId: string) {
    return this.prisma.streamerBalance.findMany({
      where: { streamerId },
    });
  }

  async getWithdrawals(streamerId: string) {
    return this.prisma.streamerWithdrawal.findMany({
      where: { streamerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async withdraw(streamerId: string, amount: number, address: string) {
    const balances = await this.prisma.streamerBalance.findMany({
      where: { streamerId },
    });
    if (balances.some((balance) => balance.balance < amount)) {
      throw new NotFoundException('Insufficient funds');
    }

    return this.prisma.$transaction(async (prisma) => {
      await prisma.streamerBalance.update({
        where: { streamerId_currency: { streamerId, currency: Currency.SOL } },
        data: {
          balance: { decrement: amount },
          pending: { increment: amount },
        },
      });

      return prisma.streamerWithdrawal.create({
        data: {
          streamerId,
          currency: Currency.SOL,
          amount,
          address,
          status: StreamerWithdrawalStatus.PENDING,
        },
      });
    });
  }
}
