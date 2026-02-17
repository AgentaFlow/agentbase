import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';
import { SsoProvider } from '../../../database/entities/sso-config.entity';

export class CreateSsoConfigDto {
  @IsEnum(SsoProvider)
  provider: SsoProvider;

  @IsString() @MaxLength(100)
  displayName: string;

  @IsOptional() @IsString()
  teamId?: string;

  // SAML
  @IsOptional() @IsString() samlEntryPoint?: string;
  @IsOptional() @IsString() samlIssuer?: string;
  @IsOptional() @IsString() samlCertificate?: string;

  // OIDC
  @IsOptional() @IsString() oidcDiscoveryUrl?: string;
  @IsOptional() @IsString() oidcClientId?: string;
  @IsOptional() @IsString() oidcClientSecret?: string;
  @IsOptional() @IsArray() oidcScopes?: string[];

  // Options
  @IsOptional() @IsBoolean() autoProvision?: boolean;
  @IsOptional() @IsString() defaultRole?: string;
  @IsOptional() @IsArray() allowedDomains?: string[];
  @IsOptional() attributeMapping?: Record<string, string>;
}

export class UpdateSsoConfigDto extends CreateSsoConfigDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsBoolean() enforced?: boolean;
}
