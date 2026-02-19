import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { Application, AppStatus } from "../../database/entities";

describe("ApplicationsService", () => {
  let service: ApplicationsService;
  let repo: Record<string, jest.Mock>;

  const mockApp: Partial<Application> = {
    id: "app-1",
    name: "Test App",
    slug: "test-app",
    ownerId: "user-1",
    config: { aiProvider: "openai", aiModel: "gpt-4", temperature: 0.7 },
    status: AppStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: "app-1", ...entity }),
        ),
      find: jest.fn().mockResolvedValue([mockApp]),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getRepositoryToken(Application), useValue: repo },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ─── Create ──────────────────────────────────────────────
  describe("create", () => {
    it("should create application with generated slug", async () => {
      const dto = { name: "My Cool App", description: "A test app" };
      const result = await service.create("user-1", dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Cool App",
          ownerId: "user-1",
          slug: "my-cool-app",
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result.id).toBe("app-1");
    });

    it("should validate model-provider combo if config provided", async () => {
      const dto = {
        name: "Bad Config App",
        config: { aiProvider: "openai", aiModel: "claude-sonnet-4-5-20250929" },
      };

      await expect(service.create("user-1", dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should accept valid model-provider combo", async () => {
      const dto = {
        name: "Good Config App",
        config: { aiProvider: "openai", aiModel: "gpt-4" },
      };

      const result = await service.create("user-1", dto as any);
      expect(result.id).toBe("app-1");
    });
  });

  // ─── Find ────────────────────────────────────────────────
  describe("findAllByOwner", () => {
    it("should return apps for the given owner", async () => {
      const result = await service.findAllByOwner("user-1");
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: "user-1" } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("findById", () => {
    it("should throw NotFoundException when app does not exist", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when ownerId does not match", async () => {
      repo.findOne.mockResolvedValue(mockApp);
      await expect(service.findById("app-1", "other-user")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return app when ownerId matches", async () => {
      repo.findOne.mockResolvedValue(mockApp);
      const result = await service.findById("app-1", "user-1");
      expect(result.id).toBe("app-1");
    });

    it("should return app when no ownerId check is required", async () => {
      repo.findOne.mockResolvedValue(mockApp);
      const result = await service.findById("app-1");
      expect(result.id).toBe("app-1");
    });
  });

  describe("findBySlug", () => {
    it("should query by slug", async () => {
      repo.findOne.mockResolvedValue(mockApp);
      const result = await service.findBySlug("test-app");
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { slug: "test-app" },
      });
      expect(result).toBeTruthy();
    });
  });

  // ─── Update ──────────────────────────────────────────────
  describe("update", () => {
    it("should update and save the application", async () => {
      repo.findOne.mockResolvedValue({ ...mockApp });
      const result = await service.update("app-1", "user-1", {
        name: "Updated",
      } as any);
      expect(repo.save).toHaveBeenCalled();
    });

    it("should reject invalid model-provider config on update", async () => {
      repo.findOne.mockResolvedValue({ ...mockApp });
      await expect(
        service.update("app-1", "user-1", {
          config: { aiProvider: "anthropic", aiModel: "gpt-4" },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── UpdateConfig ────────────────────────────────────────
  describe("updateConfig", () => {
    it("should merge partial config onto existing", async () => {
      repo.findOne.mockResolvedValue({ ...mockApp });
      const result = await service.updateConfig("app-1", "user-1", {
        temperature: 0.9,
      } as any);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            temperature: 0.9,
            aiProvider: "openai",
          }),
        }),
      );
    });

    it("should validate model when both provider and model change", async () => {
      repo.findOne.mockResolvedValue({ ...mockApp });
      await expect(
        service.updateConfig("app-1", "user-1", {
          aiProvider: "anthropic",
          aiModel: "gpt-4",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Delete ──────────────────────────────────────────────
  describe("delete", () => {
    it("should delete the application", async () => {
      repo.findOne.mockResolvedValue(mockApp);
      await service.delete("app-1", "user-1");
      expect(repo.remove).toHaveBeenCalledWith(mockApp);
    });

    it("should throw NotFoundException if app does not exist", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.delete("missing", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
