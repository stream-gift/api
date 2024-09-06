import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, DonationStatus } from '@prisma/client';

@Injectable()
export class DonationService {
  constructor(private prisma: PrismaService) {}

  async donate(message: string, name: string, amount: number, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { isLocked: false },
    });

    if (!address) {
      // Create a new address

      throw new NotFoundException('No available addresses');
    }

    return this.prisma.$transaction(async (prisma) => {
      const donation = await prisma.donation.create({
        data: {
          message,
          name,
          currency: Currency.SOL,
          amount,
          usd: amount * 0.001,
          userId,
          addressId: address.id,
          status: DonationStatus.PENDING, // Set initial status
        },
      });

      await prisma.address.update({
        where: { id: address.id },
        data: {
          isLocked: true,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        }, // Lock for 15 minutes
      });

      return donation;
    });
  }

  async checkDonation(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: { address: true },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    // Here you would typically check the blockchain for the transaction
    // For now, we'll just return the donation data
    return donation;
  }

  async processDonation(donationId: string) {
    return this.prisma.$transaction(async (prisma) => {
      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
        include: {
          user: {
            include: { balances: { where: { currency: Currency.SOL } } },
          },
        },
      });

      if (!donation) {
        throw new NotFoundException('Donation not found');
      }

      await prisma.streamerBalance.update({
        where: {
          userId_currency: {
            userId: donation.userId,
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
        data: { status: DonationStatus.COMPLETED },
      });
    });
  }
}
