import { IsString, IsUUID, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9\-\.]*\.[a-zA-Z]{2,}$/, {
    message: 'Invalid domain format',
  })
  domain: string;

  @IsUUID()
  @IsOptional()
  applicationId?: string;
}

export class UpdateDomainSettingsDto {
  @IsOptional()
  redirectWww?: boolean;

  @IsOptional()
  forceHttps?: boolean;

  @IsOptional()
  applicationId?: string;
}
