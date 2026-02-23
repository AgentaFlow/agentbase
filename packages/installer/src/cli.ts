#!/usr/bin/env node

import { Command } from "commander";
import { installCommand } from "./commands/install";
import { updateCommand } from "./commands/update";
import { checkCommand } from "./commands/check";
import { statusCommand } from "./commands/status";

const program = new Command();

program
  .name("agentbase")
  .description("Agentbase - Self-hosted AI application platform installer")
  .version("0.1.0");

program
  .command("install")
  .description("Install Agentbase on this system")
  .option("--non-interactive", "Run in non-interactive mode with defaults")
  .option("--db-host <host>", "PostgreSQL host", "localhost")
  .option("--db-port <port>", "PostgreSQL port", "5432")
  .option("--db-name <name>", "PostgreSQL database name", "agentbase")
  .option("--db-user <user>", "PostgreSQL user", "agentbase")
  .option("--db-password <password>", "PostgreSQL password")
  .option(
    "--mongo-uri <uri>",
    "MongoDB connection URI",
    "mongodb://localhost:27017/agentbase",
  )
  .option("--redis-url <url>", "Redis connection URL", "redis://localhost:6379")
  .option("--admin-email <email>", "Admin email address")
  .option("--admin-password <password>", "Admin password")
  .option("--port <port>", "Application port", "3000")
  .option("--domain <domain>", "Domain name for the installation")
  .action(installCommand);

program
  .command("update")
  .description("Update Agentbase to the latest version")
  .option("--backup", "Create a backup before updating", true)
  .option("--version <version>", "Update to a specific version")
  .action(updateCommand);

program
  .command("check")
  .description("Check system requirements")
  .action(checkCommand);

program
  .command("status")
  .description("Show current installation status")
  .action(statusCommand);

program.parse();
