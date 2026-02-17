import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/json', 'application/zip', 'text/plain', 'text/markdown',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly localDir = join(process.cwd(), 'uploads');
  private s3Client: any = null;

  constructor(private readonly config: ConfigService) {
    const bucket = this.config.get('S3_BUCKET');
    if (bucket) {
      try {
        const { S3Client } = require('@aws-sdk/client-s3');
        this.s3Client = new S3Client({
          region: this.config.get('S3_REGION', 'us-east-1'),
          credentials: {
            accessKeyId: this.config.get('S3_ACCESS_KEY'),
            secretAccessKey: this.config.get('S3_SECRET_KEY'),
          },
          ...(this.config.get('S3_ENDPOINT') ? { endpoint: this.config.get('S3_ENDPOINT') } : {}),
        });
        this.logger.log(`S3 configured: bucket=${bucket}`);
      } catch {
        this.logger.warn('AWS SDK not installed — using local storage');
      }
    } else {
      this.logger.log('No S3_BUCKET configured — using local file storage');
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'general',
  ): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(`File type not allowed: ${mimeType}`);
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const ext = originalName.split('.').pop() || 'bin';
    const key = `${folder}/${randomBytes(12).toString('hex')}.${ext}`;

    if (this.s3Client) {
      return this.uploadToS3(buffer, key, mimeType);
    }
    return this.uploadToLocal(buffer, key, mimeType);
  }

  private async uploadToS3(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const bucket = this.config.get('S3_BUCKET');

    await this.s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }));

    const region = this.config.get('S3_REGION', 'us-east-1');
    const endpoint = this.config.get('S3_ENDPOINT');
    const url = endpoint
      ? `${endpoint}/${bucket}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    this.logger.log(`Uploaded to S3: ${key} (${buffer.length} bytes)`);
    return { key, url, size: buffer.length, mimeType };
  }

  private async uploadToLocal(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    const filePath = join(this.localDir, key);
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(filePath, buffer);

    const baseUrl = this.config.get('APP_URL', 'http://localhost:3001');
    const url = `${baseUrl}/uploads/${key}`;

    this.logger.log(`Uploaded locally: ${key} (${buffer.length} bytes)`);
    return { key, url, size: buffer.length, mimeType };
  }

  getPublicUrl(key: string): string {
    if (this.s3Client) {
      const bucket = this.config.get('S3_BUCKET');
      const region = this.config.get('S3_REGION', 'us-east-1');
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    const baseUrl = this.config.get('APP_URL', 'http://localhost:3001');
    return `${baseUrl}/uploads/${key}`;
  }
}
