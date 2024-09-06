import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';

@Controller('donation')
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post('donate')
  donate(
    @Body()
    donation: CreateDonationDto,
  ) {
    return this.donationService.donate(donation);
  }

  @Get('check/:id')
  checkDonation(@Param('id') id: string) {
    return this.donationService.checkDonation(id);
  }
}
