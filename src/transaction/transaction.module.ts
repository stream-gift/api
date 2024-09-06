import { Module } from '@nestjs/common';
import { TransactionListenerService } from './transaction-listener.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DonationModule } from '../donation/donation.module';

@Module({
  imports: [PrismaModule, DonationModule],
  providers: [TransactionListenerService],
  exports: [TransactionListenerService],
})
export class TransactionModule {}
