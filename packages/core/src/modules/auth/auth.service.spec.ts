import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue("mock-token"),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          JWT_SECRET: "test-secret",
          JWT_REFRESH_SECRET: "test-refresh-secret",
          JWT_EXPIRATION: "15m",
          JWT_REFRESH_EXPIRATION: "7d",
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should throw ConflictException if email already exists", async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: "1",
        email: "test@example.com",
      });

      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
          displayName: "Test",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("should throw UnauthorizedException if user not found", async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({
          email: "nonexistent@example.com",
          password: "password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("validateUser", () => {
    it("should return user if found", async () => {
      const mockUser = { id: "1", email: "test@example.com", name: "Test" };
      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser("1");
      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException if user not found", async () => {
      (usersService.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.validateUser("nonexistent")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
