import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsIn(['development', 'production'])
  ENV: string;

  @IsNumber()
  @IsOptional()
  PORT: number;

  @IsString()
  SERVER_URL: string;

  @IsString()
  CLIENT_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  COOKIE_DOMAIN: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  SOLANA_WS_ENDPOINT: string;

  @IsString()
  SOLANA_HTTP_ENDPOINT: string;

  @IsString()
  SONIC_L2_WS_ENDPOINT: string;

  @IsString()
  SONIC_L2_HTTP_ENDPOINT: string;

  @IsString()
  @IsOptional()
  SOLANA_MAINNET_HTTP_ENDPOINT: string;

  @IsString()
  SOLANA_WALLET_MNEMONIC: string;

  @IsString()
  TWITCH_CLIENT_ID: string;

  @IsString()
  TWITCH_CLIENT_SECRET: string;

  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsString()
  TIKTOK_CLIENT_ID: string;

  @IsString()
  TIKTOK_CLIENT_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
