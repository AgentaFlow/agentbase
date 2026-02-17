import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GitHubOAuthService } from './strategies/github.strategy';
import { GoogleOAuthService } from './strategies/google.strategy';
import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { randomBytes } from 'crypto';

class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

class PasswordResetRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

class PasswordResetDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly githubOAuth: GitHubOAuthService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:3000');
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // --- OAuth: GitHub ---
  @Get('github')
  @ApiOperation({ summary: 'Redirect to GitHub OAuth' })
  async githubAuth(@Res() res: Response) {
    if (!this.githubOAuth.isConfigured) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }
    const state = randomBytes(16).toString('hex');
    const url = this.githubOAuth.getAuthorizationUrl(state);
    res.redirect(url);
  }

  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const accessToken = await this.githubOAuth.exchangeCodeForToken(code);
      const profile = await this.githubOAuth.getProfile(accessToken);
      const user = await this.githubOAuth.findOrCreateUser(profile);
      const tokens = await this.authService.generateTokensForOAuth(user);

      // Redirect to frontend with tokens
      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      res.redirect(`${this.frontendUrl}/auth/callback?${params}`);
    } catch (error) {
      res.redirect(`${this.frontendUrl}/login?error=github_failed`);
    }
  }

  // --- OAuth: Google ---
  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  async googleAuth(@Res() res: Response) {
    if (!this.googleOAuth.isConfigured) {
      throw new BadRequestException('Google OAuth is not configured');
    }
    const state = randomBytes(16).toString('hex');
    const url = this.googleOAuth.getAuthorizationUrl(state);
    res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const accessToken = await this.googleOAuth.exchangeCodeForToken(code);
      const profile = await this.googleOAuth.getProfile(accessToken);
      const user = await this.googleOAuth.findOrCreateUser(profile);
      const tokens = await this.authService.generateTokensForOAuth(user);

      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      res.redirect(`${this.frontendUrl}/auth/callback?${params}`);
    } catch (error) {
      res.redirect(`${this.frontendUrl}/login?error=google_failed`);
    }
  }

  // --- OAuth: Available providers ---
  @Get('providers')
  @ApiOperation({ summary: 'List available OAuth providers' })
  async getProviders() {
    return {
      providers: [
        { name: 'github', enabled: this.githubOAuth.isConfigured },
        { name: 'google', enabled: this.googleOAuth.isConfigured },
      ],
    };
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: PasswordResetDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getProfile(@Request() req: any) {
    const user = await this.authService.validateUser(req.user.sub);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
