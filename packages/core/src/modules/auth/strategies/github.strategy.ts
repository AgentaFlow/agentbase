import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface GitHubProfile {
  id: string;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
}

@Injectable()
export class GitHubOAuthService {
  private readonly logger = new Logger(GitHubOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.clientId = this.configService.get('GITHUB_CLIENT_ID', '');
    this.clientSecret = this.configService.get('GITHUB_CLIENT_SECRET', '');
    this.callbackUrl = this.configService.get(
      'GITHUB_CALLBACK_URL',
      'http://localhost:3001/api/auth/github/callback',
    );
  }

  get isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'user:email read:user',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description}`);
    }
    return data.access_token;
  }

  async getProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await response.json();

    // Get primary email if not public
    if (!profile.email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const emails = await emailResponse.json();
      const primary = emails.find((e: any) => e.primary) || emails[0];
      profile.email = primary?.email;
    }

    return profile;
  }

  async findOrCreateUser(profile: GitHubProfile) {
    // Check if user exists by GitHub ID
    let user = await this.usersService.findByGithubId(profile.id);
    if (user) {
      this.logger.log(`GitHub login: existing user ${user.email}`);
      return user;
    }

    // Check if user exists by email
    if (profile.email) {
      user = await this.usersService.findByEmail(profile.email);
      if (user) {
        // Link GitHub account to existing user
        await this.usersService.update(user.id, {
          githubId: profile.id,
          avatarUrl: user.avatarUrl || profile.avatar_url,
        });
        this.logger.log(`GitHub linked to existing user: ${user.email}`);
        return this.usersService.findById(user.id);
      }
    }

    // Create new user
    const newUser = await this.usersService.create({
      email: profile.email || `${profile.login}@github.user`,
      passwordHash: '', // OAuth users don't need a password
      displayName: profile.name || profile.login,
      githubId: profile.id,
      avatarUrl: profile.avatar_url,
    });

    this.logger.log(`New user created via GitHub: ${newUser.email}`);
    return newUser;
  }
}
