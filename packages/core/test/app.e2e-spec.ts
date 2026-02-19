import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("App (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix("api");
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Health ──────────────────────────────────────────────
  describe("/api/health (GET)", () => {
    it("should return health status", () => {
      return request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("ok");
          expect(res.body.service).toBe("agentbase-core");
        });
    });
  });

  // ─── Auth: Validation ────────────────────────────────────
  describe("/api/auth/register (POST)", () => {
    it("should reject empty body", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({})
        .expect(400);
    });

    it("should reject invalid email", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ email: "not-an-email", password: "password123" })
        .expect(400);
    });

    it("should reject short password", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ email: "test@e2e.com", password: "short" })
        .expect(400);
    });
  });

  describe("/api/auth/login (POST)", () => {
    it("should reject empty body", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({})
        .expect(400);
    });
  });

  // ─── Auth: Critical Flow ─────────────────────────────────
  describe("Critical user flow: register → login → app CRUD", () => {
    const testEmail = `e2e-${Date.now()}@test.com`;
    const testPassword = "TestPassword123!";
    let accessToken: string;
    let appId: string;

    it("should register a new user", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          displayName: "E2E User",
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      accessToken = res.body.accessToken;
    });

    it("should login with the same credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      accessToken = res.body.accessToken; // refresh token
    });

    it("should get authenticated user profile", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testEmail);
      expect(res.body.displayName).toBe("E2E User");
    });

    it("should reject unauthenticated access to applications", () => {
      return request(app.getHttpServer()).get("/api/applications").expect(401);
    });

    it("should create an application", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/applications")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "E2E Test App",
          description: "Created by e2e test",
          config: { aiProvider: "openai", aiModel: "gpt-4", temperature: 0.7 },
        })
        .expect(201);

      expect(res.body.name).toBe("E2E Test App");
      expect(res.body.slug).toBe("e2e-test-app");
      appId = res.body.id;
    });

    it("should list the user's applications", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/applications")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((a: any) => a.id === appId)).toBe(true);
    });

    it("should get application by ID", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.name).toBe("E2E Test App");
    });

    it("should update application config", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/config`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ temperature: 0.9, aiModel: "gpt-4o" })
        .expect(200);

      expect(res.body.config.temperature).toBe(0.9);
      expect(res.body.config.aiModel).toBe("gpt-4o");
    });

    it("should reject invalid model-provider config", async () => {
      return request(app.getHttpServer())
        .patch(`/api/applications/${appId}/config`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ aiProvider: "openai", aiModel: "claude-sonnet-4-5-20250929" })
        .expect(400);
    });

    it("should delete the application", async () => {
      await request(app.getHttpServer())
        .delete(`/api/applications/${appId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/applications/${appId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ─── OAuth Providers ─────────────────────────────────────
  describe("/api/auth/providers (GET)", () => {
    it("should list available OAuth providers", () => {
      return request(app.getHttpServer())
        .get("/api/auth/providers")
        .expect(200)
        .expect((res) => {
          expect(res.body.providers).toBeDefined();
          expect(Array.isArray(res.body.providers)).toBe(true);
        });
    });
  });

  // ─── Hooks ───────────────────────────────────────────────
  describe("/api/hooks (GET)", () => {
    it("should require authentication", () => {
      return request(app.getHttpServer()).get("/api/hooks").expect(401);
    });
  });
});
