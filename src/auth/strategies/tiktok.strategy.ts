import { Strategy } from 'passport-tiktok-auth';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { getURL } from 'src/common/utils';

@Injectable()
export class TiktokStrategy extends PassportStrategy(Strategy, 'tiktok') {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      clientID: configService.get('TIKTOK_CLIENT_ID'),
      clientSecret: configService.get('TIKTOK_CLIENT_SECRET'),
      callbackURL: getURL('server', '/auth/tiktok/callback'),
      scope: ['user.info.basic'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    let user: any;

    // Find user by email
    user = await this.prismaService.user.findUnique({
      where: {
        email: profile.email,
      },
    });

    // First time logging in ever
    if (!user) {
      user = await this.prismaService.user.create({
        data: {
          email: profile.email,
          tiktokData: profile,
          tiktokImage: profile.avatarUrl,
        },
      });

      return done(null, { userId: user.id, isNewUser: true });
    }

    // First time logging in with TikTok
    if (!user.tiktokData) {
      user = await this.prismaService.user.update({
        where: {
          email: user.email,
        },
        data: {
          tiktokData: profile,
          tiktokImage: profile.avatarUrl,
        },
      });
    }

    return done(null, { userId: user.id, isNewUser: false });
  }
}
