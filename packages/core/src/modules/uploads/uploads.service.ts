import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
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
  private azureContainer: any = null;

  constructor(private readonly config: ConfigService) {
    const azureAccount = this.config.get('AZURE_STORAGE_ACCOUNT');
    const bucket = this.config.get('S3_BUCKET');

    // Preferred on Azure: Blob Storage via managed identity (no account keys).
    if (azureAccount) {
      try {
        const { BlobServiceClient } = require('@azure/storage-blob');
        const { DefaultAzureCredential } = require('@azure/identity');
        const endpoint =
          this.config.get('AZURE_STORAGE_BLOB_ENDPOINT') ||
          `https://${azureAccount}.blob.core.windows.net`;
        const service = new BlobServiceClient(endpoint, new DefaultAzureCredential());
        this.azureContainer = service.getContainerClient(
          this.config.get('AZURE_STORAGE_CONTAINER', 'uploads'),
        );
        this.logger.log(`Azure Blob storage configured: account=${azureAccount}`);
      } catch {
        this.logger.warn('@azure/storage-blob not installed — falling back');
      }
    }

    if (!this.azureContainer && bucket) {
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
    }

    if (!this.azureContainer && !this.s3Client) {
      this.logger.log('No object storage configured — using local file storage');
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
    const safeFolder = folder
      .replace(/\\/g, '/')
      .split('/')
      .filter((p) => p && p !== '.' && p !== '..')
      .join('/');
    const key = `${safeFolder || 'general'}/${randomBytes(12).toString('hex')}.${ext}`;

    if (this.azureContainer) {
      return this.uploadToAzure(buffer, key, mimeType);
    }
    if (this.s3Client) {
      return this.uploadToS3(buffer, key, mimeType);
    }
    return this.uploadToLocal(buffer, key, mimeType);
  }

  private async uploadToAzure(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    const blob = this.azureContainer.getBlockBlobClient(key);
    await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mimeType } });
    this.logger.log(`Uploaded to Azure Blob: ${key} (${buffer.length} bytes)`);
    // The container is private and (in prod) the storage account has no public
    // network access — the raw blob URL is NOT browser-reachable. Hand back an
    // app-mediated URL; the app streams the blob over its VNet-integrated identity.
    return { key, url: this.azureFileUrl(key), size: buffer.length, mimeType };
  }

  /** Public capability URL served by UploadsFileController. */
  private azureFileUrl(key: string): string {
    const baseUrl = this.config.get('APP_URL', 'http://localhost:3001').replace(/\/$/, '');
    return `${baseUrl}/api/uploads/file?key=${encodeURIComponent(key)}`;
  }

  /** Streams a stored Azure blob. Backs the public download endpoint. */
  async getObject(
    key: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string; contentLength?: number }> {
    if (!this.azureContainer) {
      throw new NotFoundException('Object storage not configured for streaming');
    }
    const download = await this.azureContainer.getBlockBlobClient(key).download();
    return {
      stream: download.readableStreamBody,
      contentType: download.contentType || 'application/octet-stream',
      contentLength: download.contentLength,
    };
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
    if (this.azureContainer) {
      return this.azureFileUrl(key);
    }
    if (this.s3Client) {
      const bucket = this.config.get('S3_BUCKET');
      const region = this.config.get('S3_REGION', 'us-east-1');
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    const baseUrl = this.config.get('APP_URL', 'http://localhost:3001');
    return `${baseUrl}/uploads/${key}`;
  }
}
