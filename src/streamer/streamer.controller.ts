import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Version,
} from '@nestjs/common';
import { StreamerService } from './streamer.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { Currency } from '@prisma/client';

@Controller('streamer')
@UseGuards(ClerkAuthGuard)
export class StreamerController {
  constructor(private readonly streamerService: StreamerService) {}

  @Post('onboard')
  onboard(@Body() body: { address: string }, @Req() req: any) {
    return this.streamerService.onboard(req.user.id, body.address);
  }

  @Get('settings')
  getSettings(@Req() req: any) {
    return this.streamerService.getSettings(req.user.id);
  }

  @Post('settings/set')
  setSettings(@Body() settings: any, @Req() req: any) {
    return this.streamerService.setSettings(req.user.id, settings);
  }

  @Get('addresses')
  getAddresses(@Req() req: any) {
    return this.streamerService.getAddresses(req.user.id);
  }

  @Post('addresses/add')
  addAddress(
    @Body() body: { address: string; currency: Currency },
    @Req() req: any,
  ) {
    return this.streamerService.addAddress(
      req.user.id,
      body.address,
      body.currency,
    );
  }

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.streamerService.getDashboard(req.user.id);
  }

  @Get('donations')
  getDonations(@Req() req: any) {
    return this.streamerService.getDonations(req.user.id);
  }

  @Get('withdrawals')
  getWithdrawals(@Req() req: any) {
    return this.streamerService.getWithdrawals(req.user.id);
  }

  @Post('withdraw')
  withdraw(@Body() body: { amount: number; address: string }, @Req() req: any) {
    return this.streamerService.withdraw(
      req.user.id,
      body.amount,
      body.address,
    );
  }
}
