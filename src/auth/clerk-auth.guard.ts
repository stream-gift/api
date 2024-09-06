import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient, ClerkClient } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerk: ClerkClient;

  constructor() {
    this.clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return true;

    //     const request = context.switchToHttp().getRequest();
    //     const sessionToken = request.headers['authorization']?.split(' ')[1];

    //     if (!sessionToken) {
    //       throw new UnauthorizedException('No token provided');
    //     }

    //     try {
    //       const session = await this.clerk.sessions.verifySession(sessionToken);
    //       if (session) {
    //         // Attach the user to the request object for later use
    //         request.user = await this.clerk.users.getUser(session.userId);
    //         return true;
    //       }
    //     } catch (error) {
    //       throw new UnauthorizedException('Invalid token');
    //     }

    //     return false;
  }
}
