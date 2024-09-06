import { Currency } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDonationDto {
  @IsNotEmpty()
  @MaxLength(280)
  message: string;

  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  @IsEnum(Currency)
  currency: Currency;
}
