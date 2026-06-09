import { Module, Global } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { UploadsFileController } from './uploads-file.controller';

@Global()
@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 },
      storage: require('multer').memoryStorage(),
    }),
  ],
  controllers: [UploadsController, UploadsFileController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
