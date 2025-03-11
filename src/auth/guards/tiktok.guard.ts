import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TiktokGuard extends AuthGuard('tiktok') {
  constructor() {
    super({
      accessType: 'offline',
    });
  }
}
