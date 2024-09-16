import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StreamerModule } from './streamer/streamer.module';
import { DonationModule } from './donation/donation.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { HealthModule } from './health/health.module';
import { validate } from './env.validation';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    StreamerModule,
    DonationModule,
    PrismaModule,
    AuthModule,
    TransactionModule,
    HealthModule,
    WalletModule,
  ],
})
export class AppModule {}
