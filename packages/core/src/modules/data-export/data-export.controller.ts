import {
  Controller, Get, Post, Body, Query, UseGuards, Request, Res,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { DataExportService, ExportOptions } from './data-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('data-export')
@Controller('data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataExportController {
  constructor(private readonly exportService: DataExportService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export data as JSON or CSV' })
  async exportData(
    @Request() req: any,
    @Res() res: Response,
    @Query('resource') resource: string = 'all',
    @Query('format') format: string = 'json',
    @Query('applicationId') applicationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const options: ExportOptions = {
      resource: resource as any,
      format: format as any,
      applicationId,
      dateFrom: from ? new Date(from) : undefined,
      dateTo: to ? new Date(to) : undefined,
    };

    const result = await this.exportService.exportData(req.user.sub, options);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import applications from JSON' })
  @UseInterceptors(FileInterceptor('file'))
  async importData(
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
    @Body('data') bodyData?: string,
  ) {
    let data: any[];

    if (file) {
      const content = file.buffer.toString('utf-8');
      const parsed = JSON.parse(content);
      data = parsed.applications || parsed;
    } else if (bodyData) {
      const parsed = JSON.parse(bodyData);
      data = parsed.applications || parsed;
    } else {
      return { error: 'No data provided. Upload a file or pass JSON in the body.' };
    }

    if (!Array.isArray(data)) {
      return { error: 'Expected an array of applications' };
    }

    return this.exportService.importApplications(req.user.sub, data);
  }
}
