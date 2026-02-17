import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PromptsService } from './prompts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePromptDto } from './dto/create-prompt.dto';

@ApiTags('prompts')
@Controller('prompts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a prompt template' })
  async create(@Body() dto: CreatePromptDto) {
    return this.promptsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List prompt templates for an application' })
  async findAll(@Query('applicationId') applicationId: string) {
    return this.promptsService.findByApplication(applicationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a prompt template' })
  async findOne(@Param('id') id: string) {
    return this.promptsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a prompt template' })
  async update(@Param('id') id: string, @Body() data: Partial<CreatePromptDto>) {
    return this.promptsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a prompt template' })
  async delete(@Param('id') id: string) {
    await this.promptsService.delete(id);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set a prompt template as default' })
  async setDefault(
    @Param('id') id: string,
    @Query('applicationId') applicationId: string,
  ) {
    return this.promptsService.setDefault(id, applicationId);
  }

  @Post('render')
  @ApiOperation({ summary: 'Render a prompt template with variables' })
  async render(@Body() body: { template: string; variables: Record<string, string> }) {
    const rendered = this.promptsService.renderTemplate(body.template, body.variables);
    return { rendered };
  }
}
