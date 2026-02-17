import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkflowDocument = Workflow & Document;

// Node types for the visual workflow builder
export enum WorkflowNodeType {
  TRIGGER = 'trigger',          // Entry point (user message, API call, schedule)
  LLM = 'llm',                 // AI model call
  CONDITION = 'condition',       // If/else branching
  KNOWLEDGE = 'knowledge',      // RAG retrieval
  HTTP = 'http',                // External API call
  TRANSFORM = 'transform',      // Data transformation / code
  RESPONSE = 'response',        // Send response to user
  DELAY = 'delay',              // Wait/delay
  LOOP = 'loop',                // Loop over items
  HUMAN_REVIEW = 'human_review', // Pause for human approval
}

@Schema({ collection: 'workflows', timestamps: true })
export class Workflow {
  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ maxlength: 500 })
  description: string;

  @Prop({ default: 'draft', enum: ['draft', 'active', 'paused', 'archived'] })
  status: string;

  @Prop({ default: 1 })
  version: number;

  // Visual builder data
  @Prop({ type: [Object], default: [] })
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    config: Record<string, any>;
  }>;

  @Prop({ type: [Object], default: [] })
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    label?: string;
    condition?: string;
  }>;

  // Execution settings
  @Prop({ type: Object, default: {} })
  settings: {
    maxSteps?: number;
    timeout?: number;
    retryOnFailure?: boolean;
    logLevel?: string;
  };

  // Global variables accessible to all nodes
  @Prop({ type: Object, default: {} })
  variables: Record<string, any>;

  @Prop({ default: 0 })
  totalExecutions: number;

  @Prop({ default: 0 })
  successfulExecutions: number;

  @Prop({ type: Date })
  lastExecutedAt: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);
WorkflowSchema.index({ applicationId: 1, status: 1 });
WorkflowSchema.index({ ownerId: 1, createdAt: -1 });

// --- Workflow Execution Log ---

export type WorkflowExecutionDocument = WorkflowExecution & Document;

@Schema({ collection: 'workflow_executions', timestamps: true })
export class WorkflowExecution {
  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ enum: ['running', 'completed', 'failed', 'timeout', 'cancelled'], default: 'running' })
  status: string;

  @Prop()
  triggeredBy: string;

  @Prop({ type: Object })
  input: Record<string, any>;

  @Prop({ type: Object })
  output: Record<string, any>;

  @Prop({ type: [Object], default: [] })
  stepLogs: Array<{
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    input?: any;
    output?: any;
    error?: string;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
  }>;

  @Prop({ default: 0 })
  totalDurationMs: number;

  @Prop()
  error: string;

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;
}

export const WorkflowExecutionSchema = SchemaFactory.createForClass(WorkflowExecution);
WorkflowExecutionSchema.index({ workflowId: 1, startedAt: -1 });
WorkflowExecutionSchema.index({ status: 1, startedAt: -1 });
