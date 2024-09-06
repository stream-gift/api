import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, StreamerWithdrawalStatus } from '@prisma/client';

@Injectable()
export class StreamerService {
  constructor(private prisma: PrismaService) {}

  async onboard(clerkId: string, address: string) {
    return true;
  }

  async getSettings(userId: string) {
    return this.prisma.settings.findUnique({
      where: { userId },
    });
  }

  async setSettings(userId: string, settings: any) {
    return this.prisma.settings.upsert({
      where: { userId },
      update: settings,
      create: { ...settings, userId },
    });
  }

  async getAddresses(userId: string) {
    return this.prisma.streamerAddress.findMany({
      where: { userId },
    });
  }

  async addAddress(userId: string, address: string, currency: Currency) {
    return this.prisma.streamerAddress.create({
      data: { userId, address, currency },
    });
  }

  async getDashboard(userId: string) {
    const [donations, withdrawals, balances] = await Promise.all([
      this.prisma.donation.findMany({ where: { userId } }),
      this.prisma.streamerWithdrawal.findMany({ where: { userId } }),
      this.prisma.streamerBalance.findMany({ where: { userId } }),
    ]);

    return { donations, withdrawals, balances };
  }

  async getDonations(userId: string) {
    return this.prisma.donation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWithdrawals(userId: string) {
    return this.prisma.streamerWithdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async withdraw(userId: string, amount: number, address: string) {
    const balances = await this.prisma.streamerBalance.findMany({
      where: { userId },
    });
    if (balances.some((balance) => balance.balance < amount)) {
      throw new NotFoundException('Insufficient funds');
    }

    return this.prisma.$transaction(async (prisma) => {
      await prisma.streamerBalance.update({
        where: { userId_currency: { userId, currency: Currency.SOL } },
        data: {
          balance: { decrement: amount },
          pending: { increment: amount },
        },
      });

      return prisma.streamerWithdrawal.create({
        data: {
          userId,
          currency: Currency.SOL,
          amount,
          address,
          status: StreamerWithdrawalStatus.PENDING,
        },
      });
    });
  }
}
