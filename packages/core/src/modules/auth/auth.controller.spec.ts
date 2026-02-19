import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

// Minimal mock types
const mockAuthService = () => ({
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  validateUser: jest.fn(),
  generateTokensForOAuth: jest.fn(),
});

const mockGitHubOAuth = () => ({
  isConfigured: false,
  getAuthorizationUrl: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  getProfile: jest.fn(),
  findOrCreateUser: jest.fn(),
});

const mockGoogleOAuth = () => ({
  isConfigured: false,
  getAuthorizationUrl: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  getProfile: jest.fn(),
  findOrCreateUser: jest.fn(),
});

// Import the strategy service tokens by path so we can provide them
import { GitHubOAuthService } from "./strategies/github.strategy";
import { GoogleOAuthService } from "./strategies/google.strategy";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: ReturnType<typeof mockAuthService>;
  let githubOAuth: ReturnType<typeof mockGitHubOAuth>;
  let googleOAuth: ReturnType<typeof mockGoogleOAuth>;

  beforeEach(async () => {
    authService = mockAuthService();
    githubOAuth = mockGitHubOAuth();
    googleOAuth = mockGoogleOAuth();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: GitHubOAuthService, useValue: githubOAuth },
        { provide: GoogleOAuthService, useValue: googleOAuth },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, def?: string) => {
              if (key === "FRONTEND_URL") return "http://localhost:3000";
              return def;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ─── Register ────────────────────────────────────────────
  describe("register", () => {
    it("should call authService.register and return result", async () => {
      const dto = {
        email: "new@test.com",
        password: "password123",
        displayName: "New",
      };
      const expected = {
        user: { id: "1", email: "new@test.com" },
        accessToken: "tok",
        refreshToken: "ref",
        tokenType: "Bearer",
      };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── Login ───────────────────────────────────────────────
  describe("login", () => {
    it("should call authService.login and return tokens", async () => {
      const dto = { email: "test@test.com", password: "password123" };
      const expected = {
        user: { id: "1" },
        accessToken: "tok",
        refreshToken: "ref",
        tokenType: "Bearer",
      };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── Refresh ─────────────────────────────────────────────
  describe("refresh", () => {
    it("should call authService.refreshToken", async () => {
      const tokens = {
        accessToken: "new-tok",
        refreshToken: "new-ref",
        tokenType: "Bearer",
      };
      authService.refreshToken.mockResolvedValue(tokens);

      const result = await controller.refresh({
        refreshToken: "old-ref",
      } as any);

      expect(authService.refreshToken).toHaveBeenCalledWith("old-ref");
      expect(result).toEqual(tokens);
    });
  });

  // ─── OAuth: GitHub ───────────────────────────────────────
  describe("githubAuth", () => {
    it("should throw BadRequestException when GitHub OAuth is not configured", async () => {
      githubOAuth.isConfigured = false;
      const res = { redirect: jest.fn() } as any;

      await expect(controller.githubAuth(res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should redirect to GitHub when configured", async () => {
      githubOAuth.isConfigured = true;
      githubOAuth.getAuthorizationUrl.mockReturnValue(
        "https://github.com/login/oauth",
      );
      const res = { redirect: jest.fn() } as any;

      await controller.githubAuth(res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("github.com"),
      );
    });
  });

  describe("githubCallback", () => {
    it("should redirect to frontend with tokens on success", async () => {
      githubOAuth.exchangeCodeForToken.mockResolvedValue("gh-token");
      githubOAuth.getProfile.mockResolvedValue({
        id: "gh-1",
        email: "gh@test.com",
      });
      githubOAuth.findOrCreateUser.mockResolvedValue({
        id: "user-1",
        email: "gh@test.com",
        role: "user",
      });
      authService.generateTokensForOAuth.mockResolvedValue({
        accessToken: "tok",
        refreshToken: "ref",
      });

      const res = { redirect: jest.fn() } as any;
      await controller.githubCallback("code123", res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:3000/auth/callback"),
      );
    });

    it("should redirect to login with error on failure", async () => {
      githubOAuth.exchangeCodeForToken.mockRejectedValue(new Error("fail"));
      const res = { redirect: jest.fn() } as any;

      await controller.githubCallback("bad-code", res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("error=github_failed"),
      );
    });
  });

  // ─── OAuth: Google ───────────────────────────────────────
  describe("googleAuth", () => {
    it("should throw BadRequestException when Google OAuth is not configured", async () => {
      googleOAuth.isConfigured = false;
      const res = { redirect: jest.fn() } as any;

      await expect(controller.googleAuth(res)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Providers ───────────────────────────────────────────
  describe("getProviders", () => {
    it("should return list of provider availability", async () => {
      githubOAuth.isConfigured = true;
      googleOAuth.isConfigured = false;

      const result = await controller.getProviders();

      expect(result.providers).toEqual([
        { name: "github", enabled: true },
        { name: "google", enabled: false },
      ]);
    });
  });

  // ─── Password Reset ──────────────────────────────────────
  describe("requestPasswordReset", () => {
    it("should call authService.requestPasswordReset", async () => {
      authService.requestPasswordReset.mockResolvedValue({ message: "sent" });
      const result = await controller.requestPasswordReset({
        email: "test@test.com",
      } as any);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        "test@test.com",
      );
      expect(result.message).toBe("sent");
    });
  });

  describe("resetPassword", () => {
    it("should call authService.resetPassword", async () => {
      authService.resetPassword.mockResolvedValue({ message: "done" });
      const result = await controller.resetPassword({
        token: "tok",
        newPassword: "newPass123",
      } as any);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        "tok",
        "newPass123",
      );
    });
  });

  // ─── Change Password ─────────────────────────────────────
  describe("changePassword", () => {
    it("should pass user id from JWT to service", async () => {
      authService.changePassword.mockResolvedValue({ message: "changed" });
      const req = { user: { sub: "user-1" } };
      const dto = { currentPassword: "old", newPassword: "new12345" };

      await controller.changePassword(req, dto as any);

      expect(authService.changePassword).toHaveBeenCalledWith(
        "user-1",
        "old",
        "new12345",
      );
    });
  });

  // ─── Profile ─────────────────────────────────────────────
  describe("getProfile", () => {
    it("should validate user and return profile", async () => {
      const user = {
        id: "user-1",
        email: "test@test.com",
        displayName: "Test",
        avatarUrl: null,
        role: "user",
        createdAt: new Date(),
      };
      authService.validateUser.mockResolvedValue(user);

      const result = await controller.getProfile({ user: { sub: "user-1" } });

      expect(authService.validateUser).toHaveBeenCalledWith("user-1");
      expect(result.email).toBe("test@test.com");
      expect(result).not.toHaveProperty("passwordHash");
    });
  });
});
