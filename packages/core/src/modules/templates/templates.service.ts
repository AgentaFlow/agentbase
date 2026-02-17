import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppTemplate, AppTemplateDocument } from '../../database/schemas/app-template.schema';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectModel(AppTemplate.name)
    private readonly templateModel: Model<AppTemplateDocument>,
  ) {}

  async create(data: Partial<AppTemplate>) {
    const exists = await this.templateModel.findOne({ slug: data.slug });
    if (exists) throw new ConflictException('Template slug already exists');

    const template = new this.templateModel(data);
    const saved = await template.save();
    this.logger.log(`Template created: ${saved.name} (${saved.slug})`);
    return saved;
  }

  async browse(params?: {
    category?: string;
    search?: string;
    tags?: string[];
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = { isPublished: true };
    if (params?.category) query.category = params.category;
    if (params?.tags?.length) query.tags = { $in: params.tags };
    if (params?.search) {
      query.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { description: { $regex: params.search, $options: 'i' } },
        { tags: { $regex: params.search, $options: 'i' } },
      ];
    }

    const limit = params?.limit || 20;
    const skip = ((params?.page || 1) - 1) * limit;

    let sortBy: any = { deployCount: -1 };
    if (params?.sort === 'recent') sortBy = { createdAt: -1 };
    if (params?.sort === 'rating') sortBy = { rating: -1 };
    if (params?.sort === 'name') sortBy = { name: 1 };

    const [templates, total] = await Promise.all([
      this.templateModel.find(query).sort(sortBy).skip(skip).limit(limit).exec(),
      this.templateModel.countDocuments(query),
    ]);

    return { templates, total, page: params?.page || 1, limit };
  }

  async findBySlug(slug: string) {
    const template = await this.templateModel.findOne({ slug });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async findById(id: string) {
    const template = await this.templateModel.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async getCategories() {
    return [
      { key: 'chatbot', label: 'Chatbot', icon: '💬', description: 'Conversational bots for customer support, FAQ, etc.' },
      { key: 'assistant', label: 'Assistant', icon: '🤖', description: 'Personal or work assistants with specific expertise' },
      { key: 'agent', label: 'AI Agent', icon: '🧠', description: 'Autonomous agents that take actions and use tools' },
      { key: 'workflow', label: 'Workflow', icon: '⚡', description: 'Multi-step automated workflows with AI' },
      { key: 'rag', label: 'RAG App', icon: '📚', description: 'Knowledge-powered apps with document retrieval' },
      { key: 'custom', label: 'Custom', icon: '🔧', description: 'Fully customizable starting point' },
    ];
  }

  async deploy(templateId: string): Promise<{
    name: string;
    config: any;
    workflowTemplate?: any;
  }> {
    const template = await this.findById(templateId);
    // Increment deploy count
    template.deployCount = (template.deployCount || 0) + 1;
    await template.save();

    return {
      name: template.name,
      config: template.config,
      workflowTemplate: template.workflowTemplate,
    };
  }

  async update(id: string, data: Partial<AppTemplate>) {
    const template = await this.findById(id);
    Object.assign(template, data);
    return template.save();
  }

  async delete(id: string) {
    await this.templateModel.findByIdAndDelete(id);
  }

  async seedDefaults() {
    const count = await this.templateModel.countDocuments();
    if (count > 0) return;

    const defaults: Partial<AppTemplate>[] = [
      {
        name: 'Customer Support Bot',
        slug: 'customer-support',
        shortDescription: 'Handle customer inquiries with AI-powered responses',
        description: 'A professional customer support chatbot that answers questions, resolves issues, and escalates when needed. Includes sentiment detection and ticket creation.',
        icon: '🎧',
        category: 'chatbot',
        tags: ['support', 'customer-service', 'helpdesk'],
        config: {
          systemPrompt: 'You are a helpful customer support agent. Be polite, empathetic, and solution-oriented. If you cannot resolve an issue, offer to escalate to a human agent.',
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 1000,
          theme: 'professional',
        },
        isOfficial: true,
        minPlan: 'free',
      },
      {
        name: 'Code Review Assistant',
        slug: 'code-review',
        shortDescription: 'AI-powered code review and improvement suggestions',
        description: 'An AI assistant that reviews code for bugs, security issues, performance problems, and style inconsistencies. Supports multiple languages.',
        icon: '👨‍💻',
        category: 'assistant',
        tags: ['coding', 'developer', 'review', 'engineering'],
        config: {
          systemPrompt: 'You are an expert code reviewer. Analyze code for bugs, security vulnerabilities, performance issues, and style problems. Provide specific, actionable feedback with code examples.',
          model: 'gpt-4o',
          temperature: 0.2,
          maxTokens: 2000,
          theme: 'minimal',
        },
        isOfficial: true,
        minPlan: 'free',
      },
      {
        name: 'Research Agent',
        slug: 'research-agent',
        shortDescription: 'Autonomous research with source citations',
        description: 'An AI agent that conducts multi-step research, synthesizes information from multiple sources, and provides cited summaries. Ideal for market research, competitive analysis, and literature review.',
        icon: '🔬',
        category: 'agent',
        tags: ['research', 'analysis', 'agent', 'citations'],
        config: {
          systemPrompt: 'You are a thorough research agent. When given a topic, break it into sub-questions, gather information, cross-reference sources, and provide a comprehensive summary with citations.',
          model: 'gpt-4o',
          temperature: 0.4,
          maxTokens: 4000,
          knowledgeBaseEnabled: true,
          theme: 'professional',
        },
        isOfficial: true,
        minPlan: 'starter',
      },
      {
        name: 'Document Q&A',
        slug: 'document-qa',
        shortDescription: 'Answer questions from your uploaded documents',
        description: 'Upload documents and ask questions about their contents. Uses RAG to find relevant passages and generate accurate answers with source references.',
        icon: '📄',
        category: 'rag',
        tags: ['documents', 'rag', 'qa', 'knowledge'],
        config: {
          systemPrompt: 'You answer questions based on the provided context from uploaded documents. Always cite which document and section your answer comes from. If the answer is not in the documents, say so clearly.',
          model: 'gpt-4o-mini',
          temperature: 0.1,
          maxTokens: 1500,
          knowledgeBaseEnabled: true,
          theme: 'clean',
        },
        isOfficial: true,
        minPlan: 'free',
      },
      {
        name: 'Lead Qualification Bot',
        slug: 'lead-qualification',
        shortDescription: 'Qualify and score leads through conversational AI',
        description: 'A sales-focused chatbot that engages website visitors, asks qualifying questions, scores leads based on responses, and captures contact information for your sales team.',
        icon: '💼',
        category: 'chatbot',
        tags: ['sales', 'leads', 'marketing', 'qualification'],
        config: {
          systemPrompt: 'You are a friendly sales assistant. Engage the visitor in conversation, understand their needs, ask about their budget, timeline, and decision-making process. Collect their name and email. Be helpful but not pushy.',
          model: 'gpt-4o-mini',
          temperature: 0.5,
          maxTokens: 500,
          theme: 'modern',
        },
        isOfficial: true,
        minPlan: 'starter',
      },
      {
        name: 'Content Writer',
        slug: 'content-writer',
        shortDescription: 'Generate blog posts, emails, and marketing copy',
        description: 'A versatile content creation assistant that helps write blog posts, marketing emails, social media content, and ad copy. Adapts to your brand voice and style guidelines.',
        icon: '✍️',
        category: 'assistant',
        tags: ['writing', 'content', 'marketing', 'copywriting'],
        config: {
          systemPrompt: 'You are a professional content writer. Create engaging, well-structured content tailored to the audience and platform. Match the requested tone and style. Include compelling headlines and calls to action.',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 3000,
          theme: 'clean',
        },
        isOfficial: true,
        minPlan: 'free',
      },
    ];

    await this.templateModel.insertMany(defaults);
    this.logger.log(`Seeded ${defaults.length} default templates`);
  }
}
