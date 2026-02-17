import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PromptTemplate,
  PromptTemplateDocument,
} from '../../database/schemas/prompt-template.schema';

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  constructor(
    @InjectModel(PromptTemplate.name)
    private readonly promptModel: Model<PromptTemplateDocument>,
  ) {}

  async create(data: {
    applicationId: string;
    name: string;
    template: string;
    variables?: string[];
    description?: string;
  }) {
    const prompt = new this.promptModel(data);
    const saved = await prompt.save();
    this.logger.log(`Prompt template created: ${saved.name} for app ${saved.applicationId}`);
    return saved;
  }

  async findByApplication(applicationId: string) {
    return this.promptModel
      .find({ applicationId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string) {
    const prompt = await this.promptModel.findById(id).exec();
    if (!prompt) throw new NotFoundException('Prompt template not found');
    return prompt;
  }

  async update(id: string, data: Partial<PromptTemplate>) {
    const prompt = await this.promptModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!prompt) throw new NotFoundException('Prompt template not found');
    return prompt;
  }

  async delete(id: string) {
    const result = await this.promptModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Prompt template not found');
    return { message: 'Prompt template deleted' };
  }

  async setDefault(id: string, applicationId: string) {
    // Unset all defaults for this app
    await this.promptModel.updateMany(
      { applicationId, isDefault: true },
      { isDefault: false },
    );
    // Set the new default
    return this.promptModel
      .findByIdAndUpdate(id, { isDefault: true }, { new: true })
      .exec();
  }

  /**
   * Render a prompt template with variable substitution.
   */
  renderTemplate(template: string, variables: Record<string, string>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return rendered;
  }
}
