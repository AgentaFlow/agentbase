import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  async create(@Request() req: any, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workflows for current user' })
  async findAll(@Request() req: any) {
    return this.workflowsService.findByOwner(req.user.sub);
  }

  @Get('node-types')
  @ApiOperation({ summary: 'Get available workflow node types' })
  getNodeTypes() {
    return this.workflowsService.getNodeTypes();
  }

  @Get('app/:appId')
  @ApiOperation({ summary: 'List workflows for an application' })
  async findByApp(@Param('appId') appId: string) {
    return this.workflowsService.findByApp(appId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  async findOne(@Param('id') id: string) {
    return this.workflowsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  async update(@Param('id') id: string, @Body() body: Partial<CreateWorkflowDto>) {
    return this.workflowsService.update(id, body);
  }

  @Put(':id/canvas')
  @ApiOperation({ summary: 'Update workflow nodes and edges' })
  async updateCanvas(@Param('id') id: string, @Body() body: { nodes: any[]; edges: any[] }) {
    return this.workflowsService.updateCanvas(id, body.nodes, body.edges);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update workflow status (activate, pause, archive)' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.workflowsService.updateStatus(id, body.status);
  }

  @Post(':id/nodes')
  @ApiOperation({ summary: 'Add a node to the workflow' })
  async addNode(@Param('id') id: string, @Body() node: any) {
    return this.workflowsService.addNode(id, node);
  }

  @Put(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Update a specific node' })
  async updateNode(@Param('id') id: string, @Param('nodeId') nodeId: string, @Body() body: any) {
    return this.workflowsService.updateNode(id, nodeId, body);
  }

  @Delete(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Remove a node from the workflow' })
  async removeNode(@Param('id') id: string, @Param('nodeId') nodeId: string) {
    return this.workflowsService.removeNode(id, nodeId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow and all executions' })
  async delete(@Param('id') id: string) {
    await this.workflowsService.delete(id);
    return { deleted: true };
  }

  // --- Execution ---

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a workflow' })
  async execute(@Param('id') id: string, @Request() req: any, @Body() body: { input?: Record<string, any> }) {
    return this.workflowsService.execute(id, body.input || {}, req.user.sub);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get execution history for a workflow' })
  async getExecutions(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.workflowsService.getExecutions(id, parseInt(limit || '20'));
  }

  @Get('executions/:execId')
  @ApiOperation({ summary: 'Get execution details with step logs' })
  async getExecution(@Param('execId') execId: string) {
    return this.workflowsService.getExecution(execId);
  }
}
