import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Application } from "../../database/entities";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateApplicationDto } from "./dto/update-application.dto";
import { ApplicationConfigDto } from "./dto/application-config.dto";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
  ) {}

  async create(
    ownerId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    if (dto.config) {
      this.validateModelForProvider(dto.config);
    }
    const slug = this.generateSlug(dto.name);
    const app = this.appRepo.create({
      ...dto,
      slug,
      ownerId,
    });
    return this.appRepo.save(app);
  }

  async findAllByOwner(ownerId: string): Promise<Application[]> {
    return this.appRepo.find({
      where: { ownerId },
      order: { createdAt: "DESC" },
    });
  }

  async findAll(): Promise<Application[]> {
    return this.appRepo.find({ order: { createdAt: "DESC" } });
  }

  async findBySlug(slug: string): Promise<Application | null> {
    return this.appRepo.findOne({ where: { slug } });
  }

  async findById(id: string, ownerId?: string): Promise<Application> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException("Application not found");
    if (ownerId && app.ownerId !== ownerId) {
      throw new ForbiddenException("Access denied");
    }
    return app;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateApplicationDto,
  ): Promise<Application> {
    const app = await this.findById(id, ownerId);
    if (dto.config) {
      this.validateModelForProvider(dto.config);
    }
    Object.assign(app, dto);
    return this.appRepo.save(app);
  }

  async updateConfig(
    id: string,
    ownerId: string,
    configDto: ApplicationConfigDto,
  ): Promise<Application> {
    const app = await this.findById(id, ownerId);
    this.validateModelForProvider({
      aiProvider: configDto.aiProvider ?? app.config?.aiProvider,
      aiModel: configDto.aiModel ?? app.config?.aiModel,
    });
    app.config = { ...app.config, ...configDto };
    return this.appRepo.save(app);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const app = await this.findById(id, ownerId);
    await this.appRepo.remove(app);
  }

  private validateModelForProvider(config: {
    aiProvider?: string;
    aiModel?: string;
  }): void {
    if (config.aiProvider && config.aiModel) {
      const validModels = ApplicationConfigDto.getValidModels();
      const modelsForProvider = validModels[config.aiProvider];
      if (modelsForProvider && !modelsForProvider.includes(config.aiModel)) {
        throw new BadRequestException(
          `Model "${config.aiModel}" is not valid for provider "${config.aiProvider}". Valid models: ${modelsForProvider.join(", ")}`,
        );
      }
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}
