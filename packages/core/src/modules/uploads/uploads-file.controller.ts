import {
  Controller, Get, Query, Res, BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';

/**
 * Public, unauthenticated download of uploaded files (capability URL — the key is
 * unguessable random bytes). Kept in a separate controller from UploadsController
 * so it is NOT covered by that controller's class-level JwtAuthGuard: a browser
 * <img src> / <a href> cannot send an Authorization header.
 *
 * Why app-mediated rather than a direct blob URL: the Blob container is private
 * and, in prod, the storage account has public network access disabled (reachable
 * only via private endpoint inside the VNet). The app — VNet-integrated, using its
 * managed identity — is the only thing that can read the blob, so it proxies it.
 */
@ApiTags('uploads')
@Controller('uploads')
export class UploadsFileController {
  private readonly logger = new Logger(UploadsFileController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  @Get('file')
  @ApiOperation({ summary: 'Stream an uploaded file by key (public capability URL)' })
  async getFile(@Query('key') key: string, @Res() res: Response): Promise<void> {
    // Keys are `<folder>/<hex>.<ext>`. Reject anything else / path traversal.
    if (!key || key.includes('..') || !/^[A-Za-z0-9._\-/]+$/.test(key)) {
      throw new BadRequestException('Invalid key');
    }

    let object: { stream: NodeJS.ReadableStream; contentType: string; contentLength?: number };
    try {
      object = await this.uploadsService.getObject(key);
    } catch {
      throw new NotFoundException('File not found');
    }

    res.setHeader('Content-Type', object.contentType);
    if (object.contentLength != null) {
      res.setHeader('Content-Length', String(object.contentLength));
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    object.stream.on('error', (err) => {
      this.logger.error(`Stream error for ${key}: ${err.message}`);
      if (!res.headersSent) res.status(500);
      res.destroy(err);
    });
    object.stream.pipe(res);
  }
}
