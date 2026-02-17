import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('knowledge')
@Controller('knowledge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a knowledge base' })
  async create(@Request() req: any, @Body() dto: CreateKnowledgeBaseDto) {
    return this.knowledgeService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List knowledge bases for current user' })
  async findAll(@Request() req: any) {
    return this.knowledgeService.findByOwner(req.user.sub);
  }

  @Get('app/:appId')
  @ApiOperation({ summary: 'List knowledge bases for an application' })
  async findByApp(@Param('appId') appId: string) {
    return this.knowledgeService.findByApp(appId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get knowledge base details' })
  async findOne(@Param('id') id: string) {
    return this.knowledgeService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update knowledge base' })
  async update(@Param('id') id: string, @Body() body: Partial<CreateKnowledgeBaseDto>) {
    return this.knowledgeService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete knowledge base and all documents' })
  async delete(@Param('id') id: string) {
    await this.knowledgeService.delete(id);
    return { deleted: true };
  }

  // --- Documents ---

  @Get(':id/documents')
  @ApiOperation({ summary: 'List documents in a knowledge base' })
  async getDocuments(@Param('id') id: string) {
    return this.knowledgeService.getDocuments(id);
  }

  @Post(':id/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document to the knowledge base' })
  async addDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const content = file.buffer.toString('utf-8');
    return this.knowledgeService.addDocument(id, {
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      content,
    });
  }

  @Post(':id/documents/text')
  @ApiOperation({ summary: 'Add text content as a document' })
  async addTextDocument(
    @Param('id') id: string,
    @Body() body: { title: string; content: string; sourceUrl?: string },
  ) {
    return this.knowledgeService.addDocument(id, {
      fileName: body.title,
      fileType: 'text/plain',
      fileSize: Buffer.byteLength(body.content),
      content: body.content,
      sourceUrl: body.sourceUrl,
    });
  }

  @Delete('documents/:docId')
  @ApiOperation({ summary: 'Delete a document and its chunks' })
  async deleteDocument(@Param('docId') docId: string) {
    await this.knowledgeService.deleteDocument(docId);
    return { deleted: true };
  }

  // --- Search / RAG ---

  @Post(':id/search')
  @ApiOperation({ summary: 'Search knowledge base (RAG retrieval)' })
  async search(
    @Param('id') id: string,
    @Body() body: { query: string; topK?: number },
  ) {
    return this.knowledgeService.search(id, body.query, body.topK);
  }

  @Post(':id/context')
  @ApiOperation({ summary: 'Build AI context from knowledge base' })
  async buildContext(
    @Param('id') id: string,
    @Body() body: { query: string },
  ) {
    const context = await this.knowledgeService.buildContext(id, body.query);
    return { context };
  }
}
