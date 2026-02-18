import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino as the application logger
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger("Bootstrap");
  const isProd = process.env.NODE_ENV === "production";

  // Global prefix
  app.setGlobalPrefix("api");

  // Security headers (helmet)
  try {
    app.use(
      helmet({
        contentSecurityPolicy: isProd ? undefined : false,
        crossOriginEmbedderPolicy: false,
      }),
    );
  } catch {
    logger.warn("Helmet not available — skipping security headers");
  }

  // CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow configured origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow widget requests (any origin with API key auth)
      if (origin) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Request-ID",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Trust proxy (for rate limiting behind nginx)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1);

  // Swagger/OpenAPI Documentation (disable in production if desired)
  if (!isProd || process.env.ENABLE_SWAGGER === "true") {
    const config = new DocumentBuilder()
      .setTitle("Agentbase API")
      .setDescription(
        "The Agentbase platform API — WordPress for AI Applications",
      )
      .setVersion("1.0.0")
      .addBearerAuth()
      .addApiKey({ type: "apiKey", in: "header", name: "X-API-Key" }, "api-key")
      .addTag("auth", "Authentication endpoints")
      .addTag("users", "User management")
      .addTag("applications", "AI application management")
      .addTag("plugins", "Plugin system")
      .addTag("themes", "Theme system")
      .addTag("billing", "Subscription & billing")
      .addTag("webhooks", "Webhook management")
      .addTag("marketplace", "Plugin marketplace")
      .addTag("analytics", "Analytics & metrics")
      .addTag("audit", "Audit logging")
      .addTag("uploads", "File uploads")
      .addTag("health", "Health checks")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.APP_PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Agentbase API running on http://localhost:${port}`);
  if (!isProd || process.env.ENABLE_SWAGGER === "true") {
    logger.log(`📚 API docs at http://localhost:${port}/api/docs`);
  }
  logger.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
}

bootstrap();
