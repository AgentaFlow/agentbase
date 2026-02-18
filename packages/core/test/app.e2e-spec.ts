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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/health (GET)", () => {
    it("should return health status", () => {
      return request(app.getHttpServer())
        .get("/health")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("ok");
          expect(res.body.service).toBe("agentbase-core");
        });
    });
  });

  describe("/auth/register (POST)", () => {
    it("should reject invalid registration payload", () => {
      return request(app.getHttpServer())
        .post("/auth/register")
        .send({})
        .expect(400);
    });
  });
});
