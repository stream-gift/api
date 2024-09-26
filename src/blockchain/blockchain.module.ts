import { forwardRef, Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DonationModule } from '../donation/donation.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DonationModule)],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
