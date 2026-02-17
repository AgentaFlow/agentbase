import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger,
} from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

/**
 * Guard that authenticates requests using an API key in the
 * Authorization header: "Bearer ab_xxxxx" or "ApiKey ab_xxxxx"
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || '';
    const xApiKey = request.headers['x-api-key'] || '';

    let rawKey = '';
    if (xApiKey) {
      rawKey = xApiKey;
    } else if (authHeader.startsWith('Bearer ab_')) {
      rawKey = authHeader.slice(7);
    } else if (authHeader.startsWith('ApiKey ')) {
      rawKey = authHeader.slice(7);
    }

    if (!rawKey || !rawKey.startsWith('ab_')) {
      throw new UnauthorizedException('Valid API key required');
    }

    const apiKey = await this.apiKeysService.validateKey(rawKey);
    if (!apiKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach to request for downstream use
    request.apiKey = apiKey;
    request.apiKeyOwner = apiKey.owner;
    request.apiKeyApp = apiKey.application;

    return true;
  }
}
