import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { SolanaStatusResponse } from './health.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private httpService: HttpService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('streamgift', 'https://stream.gift/'),
      () => this.http.pingCheck('vodsaver', 'https://vodsaver.com/'),
      async () => {
        const response =
          await this.httpService.axiosRef.get<SolanaStatusResponse>(
            'https://status.solana.com/api/v2/status.json',
          );

        const up =
          response.data.status.description === 'All Systems Operational';

        return {
          solana: { status: up ? 'up' : 'down', ...response.data.status },
        };
      },
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
