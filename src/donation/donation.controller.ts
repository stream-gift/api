import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DonationService } from './donation.service';

@Controller('donation')
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post('donate')
  donate(
    @Body()
    body: {
      message: string;
      name: string;
      amount: number;
      userId: string;
    },
  ) {
    return this.donationService.donate(
      body.message,
      body.name,
      body.amount,
      body.userId,
    );
  }

  @Get('check/:id')
  checkDonation(@Param('id') id: string) {
    return this.donationService.checkDonation(id);
  }
}
