import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Workflow, WorkflowDocument,
  WorkflowExecution, WorkflowExecutionDocument,
} from '../../database/schemas/workflow.schema';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    @InjectModel(Workflow.name) private readonly workflowModel: Model<WorkflowDocument>,
    @InjectModel(WorkflowExecution.name) private readonly executionModel: Model<WorkflowExecutionDocument>,
    private readonly config: ConfigService,
  ) {}

  // --- CRUD ---

  async create(ownerId: string, data: {
    name: string;
    applicationId: string;
    description?: string;
    nodes?: any[];
    edges?: any[];
    settings?: any;
    variables?: Record<string, any>;
  }) {
    const workflow = new this.workflowModel({
      ...data,
      ownerId,
      status: 'draft',
      nodes: data.nodes || this.getDefaultNodes(),
      edges: data.edges || [],
      settings: {
        maxSteps: data.settings?.maxSteps || 20,
        timeout: data.settings?.timeout || 30000,
        retryOnFailure: data.settings?.retryOnFailure || false,
        logLevel: data.settings?.logLevel || 'info',
      },
    });
    const saved = await workflow.save();
    this.logger.log(`Workflow created: ${saved.name} for app ${data.applicationId}`);
    return saved;
  }

  async findByOwner(ownerId: string) {
    return this.workflowModel.find({ ownerId }).sort({ updatedAt: -1 }).exec();
  }

  async findByApp(applicationId: string) {
    return this.workflowModel.find({ applicationId }).sort({ updatedAt: -1 }).exec();
  }

  async findById(id: string) {
    const wf = await this.workflowModel.findById(id);
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  async update(id: string, data: Partial<Workflow>) {
    const wf = await this.findById(id);
    Object.assign(wf, data);
    wf.updatedAt = new Date();
    return wf.save();
  }

  async delete(id: string) {
    await this.executionModel.deleteMany({ workflowId: id });
    await this.workflowModel.findByIdAndDelete(id);
    this.logger.log(`Workflow ${id} deleted`);
  }

  async updateStatus(id: string, status: string) {
    const wf = await this.findById(id);
    wf.status = status;
    return wf.save();
  }

  // --- Canvas Operations ---

  async updateCanvas(id: string, nodes: any[], edges: any[]) {
    const wf = await this.findById(id);
    wf.nodes = nodes;
    wf.edges = edges;
    wf.version = (wf.version || 1) + 1;
    return wf.save();
  }

  async addNode(id: string, node: any) {
    const wf = await this.findById(id);
    wf.nodes.push(node);
    return wf.save();
  }

  async removeNode(id: string, nodeId: string) {
    const wf = await this.findById(id);
    wf.nodes = wf.nodes.filter((n: any) => n.id !== nodeId);
    wf.edges = wf.edges.filter((e: any) => e.source !== nodeId && e.target !== nodeId);
    return wf.save();
  }

  async updateNode(id: string, nodeId: string, updates: any) {
    const wf = await this.findById(id);
    const idx = wf.nodes.findIndex((n: any) => n.id === nodeId);
    if (idx === -1) throw new NotFoundException('Node not found');
    wf.nodes[idx] = { ...wf.nodes[idx], ...updates };
    wf.markModified('nodes');
    return wf.save();
  }

  // --- Execution Engine ---

  async execute(id: string, input: Record<string, any>, triggeredBy?: string) {
    const wf = await this.findById(id);
    if (wf.status !== 'active' && wf.status !== 'draft') {
      throw new BadRequestException('Workflow is not active');
    }

    const execution = new this.executionModel({
      workflowId: id,
      applicationId: wf.applicationId,
      status: 'running',
      triggeredBy,
      input,
      stepLogs: [],
      startedAt: new Date(),
    });
    const savedExec = await execution.save();

    // Run async (don't block the response)
    this.runExecution(wf, savedExec).catch(err => {
      this.logger.error(`Workflow execution ${savedExec._id} failed: ${err.message}`);
    });

    return savedExec;
  }

  private async runExecution(workflow: WorkflowDocument, execution: WorkflowExecutionDocument) {
    const context: Record<string, any> = {
      input: execution.input,
      variables: { ...workflow.variables },
      results: {},
    };

    try {
      // Find entry node (trigger type or first node)
      const triggerNode = workflow.nodes.find((n: any) => n.type === 'trigger') || workflow.nodes[0];
      if (!triggerNode) throw new Error('No trigger node found');

      // BFS execution through the graph
      const visited = new Set<string>();
      const queue = [triggerNode.id];
      let steps = 0;
      const maxSteps = workflow.settings?.maxSteps || 20;

      while (queue.length > 0 && steps < maxSteps) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        steps++;

        const node = workflow.nodes.find((n: any) => n.id === nodeId);
        if (!node) continue;

        const stepLog: any = {
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label,
          status: 'running',
          startedAt: new Date(),
        };

        try {
          const result = await this.executeNode(node, context);
          context.results[node.id] = result;

          stepLog.status = 'completed';
          stepLog.output = typeof result === 'string' ? result.slice(0, 500) : result;
          stepLog.completedAt = new Date();
          stepLog.durationMs = stepLog.completedAt - stepLog.startedAt;
        } catch (nodeErr: any) {
          stepLog.status = 'failed';
          stepLog.error = nodeErr.message;
          stepLog.completedAt = new Date();
          stepLog.durationMs = stepLog.completedAt - stepLog.startedAt;

          if (!workflow.settings?.retryOnFailure) {
            execution.stepLogs.push(stepLog);
            throw nodeErr;
          }
        }

        execution.stepLogs.push(stepLog);

        // Find next nodes via edges
        const outEdges = workflow.edges.filter((e: any) => e.source === nodeId);
        for (const edge of outEdges) {
          // For condition nodes, check which branch to take
          if (node.type === 'condition' && edge.sourceHandle) {
            const condResult = context.results[node.id];
            if (edge.sourceHandle === 'true' && condResult) {
              queue.push(edge.target);
            } else if (edge.sourceHandle === 'false' && !condResult) {
              queue.push(edge.target);
            }
          } else {
            queue.push(edge.target);
          }
        }
      }

      execution.status = 'completed';
      execution.output = context.results;
    } catch (err: any) {
      execution.status = 'failed';
      execution.error = err.message;
    }

    execution.completedAt = new Date();
    execution.totalDurationMs = execution.completedAt.getTime() - execution.startedAt.getTime();
    await execution.save();

    // Update workflow stats
    workflow.totalExecutions = (workflow.totalExecutions || 0) + 1;
    if (execution.status === 'completed') {
      workflow.successfulExecutions = (workflow.successfulExecutions || 0) + 1;
    }
    workflow.lastExecutedAt = new Date();
    await workflow.save();

    return execution;
  }

  private async executeNode(node: any, context: Record<string, any>): Promise<any> {
    const config = node.config || {};

    switch (node.type) {
      case 'trigger':
        return context.input;

      case 'llm': {
        // Call AI model
        const prompt = this.interpolate(config.prompt || '', context);
        const systemPrompt = this.interpolate(config.systemPrompt || '', context);

        const aiUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8000');
        try {
          const res = await fetch(`${aiUrl}/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: prompt,
              systemPrompt,
              model: config.model || 'gpt-4o-mini',
              temperature: config.temperature ?? 0.5,
              maxTokens: config.maxTokens || 1000,
            }),
          });
          const data = await res.json();
          return data.response || data.message || data;
        } catch (err: any) {
          return `[LLM Error: ${err.message}]`;
        }
      }

      case 'condition': {
        const expression = this.interpolate(config.expression || 'true', context);
        try {
          // Simple expression evaluation (only booleans and string checks)
          if (expression === 'true') return true;
          if (expression === 'false') return false;
          return expression.length > 0;
        } catch {
          return false;
        }
      }

      case 'transform': {
        const template = config.template || '';
        return this.interpolate(template, context);
      }

      case 'http': {
        const url = this.interpolate(config.url || '', context);
        const method = config.method || 'GET';
        const headers = config.headers || {};
        const body = config.body ? this.interpolate(config.body, context) : undefined;

        try {
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: method !== 'GET' ? body : undefined,
            signal: AbortSignal.timeout(10000),
          });
          return await res.json();
        } catch (err: any) {
          return { error: err.message };
        }
      }

      case 'delay': {
        const ms = config.delayMs || 1000;
        await new Promise(resolve => setTimeout(resolve, Math.min(ms, 10000)));
        return { delayed: ms };
      }

      case 'response':
        return this.interpolate(config.message || '', context);

      default:
        return { nodeType: node.type, status: 'passthrough' };
    }
  }

  private interpolate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const keys = path.trim().split('.');
      let value: any = context;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined ? String(value) : `{{${path.trim()}}}`;
    });
  }

  private getDefaultNodes(): any[] {
    return [
      {
        id: 'trigger-1',
        type: 'trigger',
        label: 'User Message',
        position: { x: 250, y: 50 },
        config: { triggerType: 'message' },
      },
      {
        id: 'llm-1',
        type: 'llm',
        label: 'AI Response',
        position: { x: 250, y: 200 },
        config: {
          prompt: '{{input.message}}',
          systemPrompt: 'You are a helpful assistant.',
          model: 'gpt-4o-mini',
          temperature: 0.5,
        },
      },
      {
        id: 'response-1',
        type: 'response',
        label: 'Send Reply',
        position: { x: 250, y: 350 },
        config: { message: '{{results.llm-1}}' },
      },
    ];
  }

  // --- Execution History ---

  async getExecutions(workflowId: string, limit = 20) {
    return this.executionModel
      .find({ workflowId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .exec();
  }

  async getExecution(executionId: string) {
    const exec = await this.executionModel.findById(executionId);
    if (!exec) throw new NotFoundException('Execution not found');
    return exec;
  }

  // --- Node Type Catalog ---
  getNodeTypes() {
    return [
      { type: 'trigger', label: 'Trigger', icon: '⚡', description: 'Entry point: user message, API call, or schedule', color: '#10B981' },
      { type: 'llm', label: 'AI Model', icon: '🧠', description: 'Call an AI model (GPT-4, Claude, etc.)', color: '#6366F1' },
      { type: 'condition', label: 'Condition', icon: '🔀', description: 'If/else branching based on expressions', color: '#F59E0B' },
      { type: 'knowledge', label: 'Knowledge', icon: '📚', description: 'Search knowledge base for context', color: '#8B5CF6' },
      { type: 'http', label: 'HTTP Request', icon: '🌐', description: 'Make external API calls', color: '#3B82F6' },
      { type: 'transform', label: 'Transform', icon: '🔄', description: 'Transform data with templates', color: '#EC4899' },
      { type: 'response', label: 'Response', icon: '💬', description: 'Send a response to the user', color: '#14B8A6' },
      { type: 'delay', label: 'Delay', icon: '⏱️', description: 'Wait for a specified duration', color: '#6B7280' },
    ];
  }
}
