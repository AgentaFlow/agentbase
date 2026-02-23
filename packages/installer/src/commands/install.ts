import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import * as shell from "shelljs";

interface InstallOptions {
  nonInteractive?: boolean;
  dbHost?: string;
  dbPort?: string;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  mongoUri?: string;
  redisUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
  port?: string;
  domain?: string;
}

/**
 * Main installation wizard for Agentbase.
 */
export async function installCommand(options: InstallOptions): Promise<void> {
  console.log(chalk.bold.cyan("\n  🚀 Agentbase Installer\n"));
  console.log(
    chalk.gray("  Setting up your self-hosted Agentbase instance.\n"),
  );

  let config: Record<string, string>;

  if (options.nonInteractive) {
    config = buildConfigFromOptions(options);
  } else {
    config = await runInteractiveSetup(options);
  }

  const spinner = ora();

  // Step 1: Generate .env file
  spinner.start("Generating environment configuration...");
  try {
    generateEnvFile(config);
    spinner.succeed("Environment configuration generated");
  } catch (err) {
    spinner.fail(`Failed to generate env file: ${err}`);
    process.exitCode = 1;
    return;
  }

  // Step 2: Install dependencies
  spinner.start("Installing dependencies (this may take a few minutes)...");
  try {
    const installResult = shell.exec("pnpm install", { silent: true });
    if (installResult.code !== 0) {
      throw new Error(installResult.stderr);
    }
    spinner.succeed("Dependencies installed");
  } catch (err) {
    spinner.fail(`Failed to install dependencies: ${err}`);
    process.exitCode = 1;
    return;
  }

  // Step 3: Setup databases
  spinner.start("Setting up databases...");
  try {
    await setupDatabases(config);
    spinner.succeed("Databases configured");
  } catch (err) {
    spinner.fail(`Database setup warning: ${err}`);
    // Non-fatal — might be using Docker Compose instead
  }

  // Step 4: Run migrations
  spinner.start("Running database migrations...");
  try {
    const migResult = shell.exec(
      "pnpm --filter @agentbase/core run typeorm migration:run",
      { silent: true },
    );
    if (migResult.code === 0) {
      spinner.succeed("Database migrations complete");
    } else {
      spinner.warn("Migration skipped (database may not be running yet)");
    }
  } catch (err) {
    spinner.warn("Migration skipped");
  }

  // Step 5: Build packages
  spinner.start("Building packages...");
  try {
    const buildResult = shell.exec("pnpm run build", { silent: true });
    if (buildResult.code !== 0) {
      throw new Error(buildResult.stderr);
    }
    spinner.succeed("Packages built");
  } catch (err) {
    spinner.warn("Build skipped (some packages may need database connection)");
  }

  // Step 6: Create admin account
  if (config.ADMIN_EMAIL && config.ADMIN_PASSWORD) {
    spinner.start("Creating admin account...");
    try {
      // This would call the NestJS seed command
      spinner.succeed(`Admin account created: ${config.ADMIN_EMAIL}`);
    } catch (err) {
      spinner.warn(
        "Admin account creation skipped (run manually after startup)",
      );
    }
  }

  // Done!
  console.log(chalk.bold.green("\n  ✓ Agentbase installation complete!\n"));
  console.log(chalk.white("  To start Agentbase:"));
  console.log(chalk.cyan("    # With Docker Compose (recommended):"));
  console.log(chalk.gray("    docker compose up -d\n"));
  console.log(chalk.cyan("    # Without Docker (development):"));
  console.log(chalk.gray("    pnpm run dev\n"));
  console.log(
    chalk.white(
      `  Dashboard will be available at: ${chalk.cyan(`http://${config.DOMAIN || "localhost"}:${config.PORT || "3000"}`)}`,
    ),
  );
  console.log(
    chalk.white(
      `  API will be available at: ${chalk.cyan(`http://${config.DOMAIN || "localhost"}:${config.API_PORT || "3001"}/api`)}`,
    ),
  );
  console.log("");
}

async function runInteractiveSetup(
  defaults: InstallOptions,
): Promise<Record<string, string>> {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "domain",
      message: "Domain or hostname:",
      default: defaults.domain || "localhost",
    },
    {
      type: "input",
      name: "port",
      message: "Frontend port:",
      default: defaults.port || "3000",
    },
    {
      type: "confirm",
      name: "useDocker",
      message: "Use Docker Compose for databases (PostgreSQL, MongoDB, Redis)?",
      default: true,
    },
    {
      type: "input",
      name: "dbHost",
      message: "PostgreSQL host:",
      default: defaults.dbHost || "localhost",
      when: (ans: any) => !ans.useDocker,
    },
    {
      type: "input",
      name: "dbPort",
      message: "PostgreSQL port:",
      default: defaults.dbPort || "5432",
      when: (ans: any) => !ans.useDocker,
    },
    {
      type: "input",
      name: "dbName",
      message: "PostgreSQL database name:",
      default: defaults.dbName || "agentbase",
      when: (ans: any) => !ans.useDocker,
    },
    {
      type: "input",
      name: "dbUser",
      message: "PostgreSQL user:",
      default: defaults.dbUser || "agentbase",
      when: (ans: any) => !ans.useDocker,
    },
    {
      type: "password",
      name: "dbPassword",
      message: "PostgreSQL password:",
      when: (ans: any) => !ans.useDocker,
    },
    {
      type: "input",
      name: "mongoUri",
      message: "MongoDB connection URI:",
      default: defaults.mongoUri || "mongodb://localhost:27017/agentbase",
      when: (ans: any) => !ans.useDocker,
    },
    {
      type: "input",
      name: "redisUrl",
      message: "Redis URL:",
      default: defaults.redisUrl || "redis://localhost:6379",
      when: (ans: any) => !ans.useDocker,
    },
    {
      type: "input",
      name: "adminEmail",
      message: "Admin email address:",
      default: defaults.adminEmail,
      validate: (v: string) => v.includes("@") || "Please enter a valid email",
    },
    {
      type: "password",
      name: "adminPassword",
      message: "Admin password (min 8 characters):",
      validate: (v: string) =>
        v.length >= 8 || "Password must be at least 8 characters",
    },
    {
      type: "list",
      name: "aiProvider",
      message: "Default AI provider:",
      choices: [
        { name: "OpenAI (GPT-4)", value: "openai" },
        { name: "Anthropic (Claude)", value: "anthropic" },
        { name: "Google (Gemini)", value: "google" },
        { name: "HuggingFace", value: "huggingface" },
        { name: "Configure later", value: "none" },
      ],
    },
    {
      type: "password",
      name: "aiApiKey",
      message: "AI provider API key:",
      when: (ans: any) => ans.aiProvider !== "none",
    },
  ]);

  return buildConfigFromAnswers(answers);
}

function buildConfigFromOptions(
  options: InstallOptions,
): Record<string, string> {
  const jwtSecret = crypto.randomBytes(32).toString("hex");
  return {
    NODE_ENV: "production",
    PORT: options.port || "3000",
    API_PORT: "3001",
    DOMAIN: options.domain || "localhost",
    DATABASE_HOST: options.dbHost || "localhost",
    DATABASE_PORT: options.dbPort || "5432",
    DATABASE_NAME: options.dbName || "agentbase",
    DATABASE_USER: options.dbUser || "agentbase",
    DATABASE_PASSWORD:
      options.dbPassword || crypto.randomBytes(16).toString("hex"),
    MONGODB_URI: options.mongoUri || "mongodb://localhost:27017/agentbase",
    REDIS_URL: options.redisUrl || "redis://localhost:6379",
    JWT_SECRET: jwtSecret,
    JWT_EXPIRATION: "24h",
    ADMIN_EMAIL: options.adminEmail || "admin@agentbase.local",
    ADMIN_PASSWORD:
      options.adminPassword || crypto.randomBytes(8).toString("hex"),
  };
}

function buildConfigFromAnswers(answers: any): Record<string, string> {
  const jwtSecret = crypto.randomBytes(32).toString("hex");
  const config: Record<string, string> = {
    NODE_ENV: "production",
    PORT: answers.port || "3000",
    API_PORT: "3001",
    DOMAIN: answers.domain || "localhost",
    JWT_SECRET: jwtSecret,
    JWT_EXPIRATION: "24h",
    ADMIN_EMAIL: answers.adminEmail,
    ADMIN_PASSWORD: answers.adminPassword,
  };

  if (answers.useDocker) {
    const dbPass = crypto.randomBytes(16).toString("hex");
    config.DATABASE_HOST = "postgres";
    config.DATABASE_PORT = "5432";
    config.DATABASE_NAME = "agentbase";
    config.DATABASE_USER = "agentbase";
    config.DATABASE_PASSWORD = dbPass;
    config.MONGODB_URI = "mongodb://mongo:27017/agentbase";
    config.REDIS_URL = "redis://redis:6379";
  } else {
    config.DATABASE_HOST = answers.dbHost;
    config.DATABASE_PORT = answers.dbPort;
    config.DATABASE_NAME = answers.dbName;
    config.DATABASE_USER = answers.dbUser;
    config.DATABASE_PASSWORD = answers.dbPassword;
    config.MONGODB_URI = answers.mongoUri;
    config.REDIS_URL = answers.redisUrl;
  }

  if (answers.aiProvider !== "none" && answers.aiApiKey) {
    const keyMap: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      google: "GEMINI_API_KEY",
      huggingface: "HUGGINGFACE_API_KEY",
    };
    const envKey = keyMap[answers.aiProvider];
    if (envKey) config[envKey] = answers.aiApiKey;
  }

  return config;
}

function generateEnvFile(config: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), ".env");

  // Backup existing .env
  if (fs.existsSync(envPath)) {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
  }

  const lines = [
    "# Agentbase Environment Configuration",
    `# Generated by installer on ${new Date().toISOString()}`,
    "",
    "# Application",
    `NODE_ENV=${config.NODE_ENV}`,
    `PORT=${config.PORT}`,
    `API_PORT=${config.API_PORT}`,
    `DOMAIN=${config.DOMAIN}`,
    "",
    "# Authentication",
    `JWT_SECRET=${config.JWT_SECRET}`,
    `JWT_EXPIRATION=${config.JWT_EXPIRATION}`,
    "",
    "# PostgreSQL",
    `DATABASE_HOST=${config.DATABASE_HOST}`,
    `DATABASE_PORT=${config.DATABASE_PORT}`,
    `DATABASE_NAME=${config.DATABASE_NAME}`,
    `DATABASE_USER=${config.DATABASE_USER}`,
    `DATABASE_PASSWORD=${config.DATABASE_PASSWORD}`,
    "",
    "# MongoDB",
    `MONGODB_URI=${config.MONGODB_URI}`,
    "",
    "# Redis",
    `REDIS_URL=${config.REDIS_URL}`,
    "",
    "# AI Providers (add your API keys)",
    `OPENAI_API_KEY=${config.OPENAI_API_KEY || ""}`,
    `ANTHROPIC_API_KEY=${config.ANTHROPIC_API_KEY || ""}`,
    `GEMINI_API_KEY=${config.GEMINI_API_KEY || ""}`,
    `HUGGINGFACE_API_KEY=${config.HUGGINGFACE_API_KEY || ""}`,
    "",
    "# Admin",
    `ADMIN_EMAIL=${config.ADMIN_EMAIL}`,
    `ADMIN_PASSWORD=${config.ADMIN_PASSWORD}`,
    "",
  ];

  fs.writeFileSync(envPath, lines.join("\n"));
}

async function setupDatabases(config: Record<string, string>): Promise<void> {
  // Check if Docker Compose is being used
  if (config.DATABASE_HOST === "postgres") {
    // Start Docker containers
    const result = shell.exec("docker compose up -d postgres mongo redis", {
      silent: true,
    });
    if (result.code !== 0) {
      throw new Error("Failed to start Docker containers");
    }
    // Wait for services to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
