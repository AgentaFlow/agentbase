import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.clientId = this.configService.get('GOOGLE_CLIENT_ID', '');
    this.clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET', '');
    this.callbackUrl = this.configService.get(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3001/api/auth/google/callback',
    );
  }

  get isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`Google OAuth error: ${data.error_description}`);
    }
    return data.access_token;
  }

  async getProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.json();
  }

  async findOrCreateUser(profile: GoogleProfile) {
    // Check if user exists by Google ID
    let user = await this.usersService.findByGoogleId(profile.id);
    if (user) {
      this.logger.log(`Google login: existing user ${user.email}`);
      return user;
    }

    // Check if user exists by email
    user = await this.usersService.findByEmail(profile.email);
    if (user) {
      await this.usersService.update(user.id, {
        googleId: profile.id,
        avatarUrl: user.avatarUrl || profile.picture,
      });
      this.logger.log(`Google linked to existing user: ${user.email}`);
      return this.usersService.findById(user.id);
    }

    // Create new user
    const newUser = await this.usersService.create({
      email: profile.email,
      passwordHash: '',
      displayName: profile.name,
      googleId: profile.id,
      avatarUrl: profile.picture,
    });

    this.logger.log(`New user created via Google: ${newUser.email}`);
    return newUser;
  }
}
