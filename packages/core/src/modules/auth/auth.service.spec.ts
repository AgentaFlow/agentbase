import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcrypt";

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  let usersService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    displayName: "Test User",
    passwordHash: "$2b$12$hashedpassword",
    role: "user",
    isActive: true,
    avatarUrl: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
      update: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue("mock-token"),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultVal?: string) => {
        const config: Record<string, any> = {
          JWT_SECRET: "test-secret",
          JWT_REFRESH_SECRET: "test-refresh-secret",
          JWT_EXPIRATION: "15m",
          JWT_REFRESH_EXPIRATION: "7d",
        };
        return config[key] ?? defaultVal;
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ─── Register ────────────────────────────────────────────
  describe("register", () => {
    it("should throw ConflictException if email already exists", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
          displayName: "Test",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should hash password and create user on success", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("$hashed$");
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: "new@example.com",
        password: "password123",
        displayName: "New User",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
      expect(usersService.create).toHaveBeenCalledWith({
        email: "new@example.com",
        passwordHash: "$hashed$",
        displayName: "New User",
      });
      expect(result.user.email).toBe("test@example.com");
      expect(result.accessToken).toBe("mock-token");
      expect(result.refreshToken).toBe("mock-token");
      expect(result.tokenType).toBe("Bearer");
    });

    it("should generate JWT tokens with correct payload", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("$hashed$");
      usersService.create.mockResolvedValue(mockUser);

      await service.register({
        email: "new@example.com",
        password: "password123",
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: "user-1", email: "test@example.com", role: "user" },
        expect.objectContaining({ expiresIn: "15m" }),
      );
    });
  });

  // ─── Login ───────────────────────────────────────────────
  describe("login", () => {
    it("should throw UnauthorizedException if user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: "nonexistent@example.com",
          password: "password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if password is wrong", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "test@example.com", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if account is deactivated", async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: "test@example.com", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should return tokens and user on successful login", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(usersService.updateLastLogin).toHaveBeenCalledWith("user-1");
      expect(result.user.id).toBe("user-1");
      expect(result.accessToken).toBe("mock-token");
      expect(result.tokenType).toBe("Bearer");
    });
  });

  // ─── Refresh Token ───────────────────────────────────────
  describe("refreshToken", () => {
    it("should return new tokens for a valid refresh token", async () => {
      jwtService.verify.mockReturnValue({
        sub: "user-1",
        email: "test@example.com",
        role: "user",
      });
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refreshToken("valid-refresh-token");

      expect(jwtService.verify).toHaveBeenCalledWith("valid-refresh-token", {
        secret: "test-refresh-secret",
      });
      expect(result.accessToken).toBe("mock-token");
    });

    it("should throw UnauthorizedException for invalid refresh token", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(service.refreshToken("invalid")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user is deactivated", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-1" });
      usersService.findById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.refreshToken("token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── Password Reset ──────────────────────────────────────
  describe("requestPasswordReset", () => {
    it("should return same message whether user exists or not", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await service.requestPasswordReset("missing@example.com");
      expect(result.message).toContain("If the email exists");
    });

    it("should generate a reset token when user exists", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      const result = await service.requestPasswordReset("test@example.com");

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: "user-1", type: "password-reset" },
        expect.objectContaining({ expiresIn: "1h" }),
      );
      expect(result.message).toContain("If the email exists");
    });
  });

  describe("resetPassword", () => {
    it("should hash and save new password for valid token", async () => {
      jwtService.verify.mockReturnValue({
        sub: "user-1",
        type: "password-reset",
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue("$new-hash$");

      const result = await service.resetPassword(
        "valid-token",
        "newPassword123",
      );

      expect(usersService.update).toHaveBeenCalledWith("user-1", {
        passwordHash: "$new-hash$",
      });
      expect(result.message).toContain("successfully");
    });

    it("should throw for invalid reset token", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("expired");
      });

      await expect(
        service.resetPassword("bad-token", "newPass"),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Change Password ─────────────────────────────────────
  describe("changePassword", () => {
    it("should throw NotFoundException if user not found", async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword("missing", "old", "new"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw UnauthorizedException if current password is wrong", async () => {
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword("user-1", "wrong", "new"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should update password hash on success", async () => {
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("$new-hash$");

      const result = await service.changePassword("user-1", "old", "newPass");

      expect(usersService.update).toHaveBeenCalledWith("user-1", {
        passwordHash: "$new-hash$",
      });
      expect(result.message).toContain("successfully");
    });
  });

  // ─── Validate User ───────────────────────────────────────
  describe("validateUser", () => {
    it("should return user if found and active", async () => {
      usersService.findById.mockResolvedValue(mockUser);
      const result = await service.validateUser("user-1");
      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException if user not found", async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(service.validateUser("nonexistent")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user is inactive", async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, isActive: false });
      await expect(service.validateUser("user-1")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── OAuth Token Generation ──────────────────────────────
  describe("generateTokensForOAuth", () => {
    it("should update last login and return tokens", async () => {
      usersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.generateTokensForOAuth(mockUser);

      expect(usersService.updateLastLogin).toHaveBeenCalledWith("user-1");
      expect(result.accessToken).toBe("mock-token");
      expect(result.tokenType).toBe("Bearer");
    });
  });
});
