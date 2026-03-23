import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { LicenseValidatorService } from "./license-validator.service";
import { MarketplaceClientService } from "./marketplace-client.service";
import {
  InstalledPlugin,
  InstalledPluginStatus,
} from "../../database/entities";

const INSTANCE_ID = "test-instance-id";

function makeInstalled(
  overrides: Partial<InstalledPlugin> = {},
): InstalledPlugin {
  return {
    id: "installed-uuid",
    status: InstalledPluginStatus.ACTIVE,
    settings: {
      isPaid: true,
      licenseKey: "AB-TEST-1234-5678-ABCD",
    },
    pluginId: "plugin-uuid",
    applicationId: "app-uuid",
    installedVersion: "1.0.0",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as InstalledPlugin;
}

describe("LicenseValidatorService", () => {
  let service: LicenseValidatorService;
  let marketplaceClient: jest.Mocked<MarketplaceClientService>;
  let installedRepo: jest.Mocked<Repository<InstalledPlugin>>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockClient: Partial<jest.Mocked<MarketplaceClientService>> = {
      validateLicense: jest.fn(),
    };

    const mockRepo: Partial<jest.Mocked<Repository<InstalledPlugin>>> = {
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };

    const mockConfig: Partial<jest.Mocked<ConfigService>> = {
      get: jest.fn().mockReturnValue(INSTANCE_ID),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseValidatorService,
        { provide: MarketplaceClientService, useValue: mockClient },
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getRepositoryToken(InstalledPlugin),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get(LicenseValidatorService);
    marketplaceClient = module.get(MarketplaceClientService);
    installedRepo = module.get(getRepositoryToken(InstalledPlugin));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear internal cache between tests
    (service as unknown as { cache: Map<string, unknown> }).cache.clear();
  });

  // ── Cache hit ────────────────────────────────────────────────────────────

  it("returns cached result and skips API call on cache hit", async () => {
    const installed = makeInstalled();
    marketplaceClient.validateLicense.mockResolvedValueOnce({ valid: true });

    // First call populates cache
    const first = await service.validate("AB-TEST-1234-5678-ABCD", installed);
    expect(first).toBe(true);
    expect(marketplaceClient.validateLicense).toHaveBeenCalledTimes(1);

    // Second call hits cache
    const second = await service.validate("AB-TEST-1234-5678-ABCD", installed);
    expect(second).toBe(true);
    expect(marketplaceClient.validateLicense).toHaveBeenCalledTimes(1); // still 1
  });

  // ── Cache miss → API returns valid ──────────────────────────────────────

  it("calls marketplace API on cache miss and returns true for valid license", async () => {
    const installed = makeInstalled();
    marketplaceClient.validateLicense.mockResolvedValueOnce({
      valid: true,
      gracePeriodEnd: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });

    const result = await service.validate("AB-TEST-1234-5678-ABCD", installed);

    expect(result).toBe(true);
    expect(marketplaceClient.validateLicense).toHaveBeenCalledWith(
      "AB-TEST-1234-5678-ABCD",
      INSTANCE_ID,
    );
    expect(installedRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          licenseLastValidated: expect.any(String),
          licenseGracePeriodEnd: expect.any(String),
        }),
      }),
    );
  });

  // ── Cache miss → API returns invalid ────────────────────────────────────

  it("returns false and does not deactivate when API reports invalid license", async () => {
    const installed = makeInstalled();
    marketplaceClient.validateLicense.mockResolvedValueOnce({ valid: false });

    const result = await service.validate("AB-INVALID-KEY", installed);

    expect(result).toBe(false);
    // settings save still happens to update lastValidated
    expect(installedRepo.save).toHaveBeenCalled();
    // status must not have been changed to INACTIVE by this code path
    expect(installed.status).toBe(InstalledPluginStatus.ACTIVE);
  });

  // ── Network failure within grace period ─────────────────────────────────

  it("returns true when marketplace is unreachable and grace period is active", async () => {
    const gracePeriodEnd = new Date(
      Date.now() + 48 * 60 * 60 * 1000,
    ).toISOString();
    const installed = makeInstalled({
      settings: {
        isPaid: true,
        licenseKey: "AB-TEST-1234-5678-ABCD",
        licenseGracePeriodEnd: gracePeriodEnd,
      },
    });

    marketplaceClient.validateLicense.mockRejectedValueOnce(
      new Error("ECONNREFUSED"),
    );

    const result = await service.validate("AB-TEST-1234-5678-ABCD", installed);

    expect(result).toBe(true);
    expect(installed.status).toBe(InstalledPluginStatus.ACTIVE);
    expect(installedRepo.save).not.toHaveBeenCalled();
  });

  // ── Network failure with expired grace period ────────────────────────────

  it("deactivates plugin and returns false when marketplace is unreachable and grace period expired", async () => {
    const expiredGrace = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago
    const installed = makeInstalled({
      settings: {
        isPaid: true,
        licenseKey: "AB-TEST-1234-5678-ABCD",
        licenseGracePeriodEnd: expiredGrace,
      },
    });

    marketplaceClient.validateLicense.mockRejectedValueOnce(
      new Error("Network timeout"),
    );

    const result = await service.validate("AB-TEST-1234-5678-ABCD", installed);

    expect(result).toBe(false);
    expect(installed.status).toBe(InstalledPluginStatus.INACTIVE);
    expect(installedRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: InstalledPluginStatus.INACTIVE }),
    );
  });

  // ── Network failure with no stored grace period ──────────────────────────

  it("deactivates plugin and returns false when marketplace is unreachable and no grace period stored", async () => {
    const installed = makeInstalled({
      settings: { isPaid: true, licenseKey: "AB-TEST-1234-5678-ABCD" },
    });

    marketplaceClient.validateLicense.mockRejectedValueOnce(
      new Error("Network timeout"),
    );

    const result = await service.validate("AB-TEST-1234-5678-ABCD", installed);

    expect(result).toBe(false);
    expect(installed.status).toBe(InstalledPluginStatus.INACTIVE);
  });

  // ── revalidateAllLicenses cron ───────────────────────────────────────────

  it("revalidateAllLicenses skips plugins that are not paid or have no licenseKey", async () => {
    installedRepo.find.mockResolvedValueOnce([
      makeInstalled({ settings: { isPaid: false } }), // free → skip
      makeInstalled({ settings: { isPaid: true } }), // paid but no licenseKey → skip
      makeInstalled({ settings: {} }), // no settings → skip
    ]);

    await service.revalidateAllLicenses();

    expect(marketplaceClient.validateLicense).not.toHaveBeenCalled();
  });

  it("revalidateAllLicenses validates each active paid plugin", async () => {
    const plugin1 = makeInstalled({
      id: "p1",
      settings: { isPaid: true, licenseKey: "AB-KEY1" },
    });
    const plugin2 = makeInstalled({
      id: "p2",
      settings: { isPaid: true, licenseKey: "AB-KEY2" },
    });

    installedRepo.find.mockResolvedValueOnce([plugin1, plugin2]);
    marketplaceClient.validateLicense
      .mockResolvedValueOnce({ valid: true })
      .mockResolvedValueOnce({ valid: false });

    await service.revalidateAllLicenses();

    expect(marketplaceClient.validateLicense).toHaveBeenCalledTimes(2);
  });
});
