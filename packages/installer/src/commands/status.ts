import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import * as shell from "shelljs";

/**
 * Show status of the current Agentbase installation.
 */
export async function statusCommand(): Promise<void> {
  console.log(chalk.bold("\n  Agentbase Installation Status\n"));

  // Version
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      console.log(
        `  ${chalk.gray("Version:")}     ${pkg.version || "unknown"}`,
      );
    }
  } catch {
    console.log(`  ${chalk.gray("Version:")}     ${chalk.yellow("unknown")}`);
  }

  // Environment
  const envPath = path.resolve(process.cwd(), ".env");
  const hasEnv = fs.existsSync(envPath);
  console.log(
    `  ${chalk.gray(".env file:")}   ${hasEnv ? chalk.green("found") : chalk.red("missing")}`,
  );

  // Node.js
  console.log(`  ${chalk.gray("Node.js:")}     ${process.version}`);

  // Docker containers
  const dockerResult = shell.exec(
    "docker compose ps --format json 2>/dev/null",
    { silent: true },
  );
  if (dockerResult.code === 0 && dockerResult.stdout.trim()) {
    console.log(`  ${chalk.gray("Docker:")}      ${chalk.green("running")}`);

    try {
      const lines = dockerResult.stdout.trim().split("\n");
      for (const line of lines) {
        try {
          const container = JSON.parse(line);
          const status =
            container.State === "running" ? chalk.green("●") : chalk.red("●");
          console.log(
            `    ${status} ${container.Service || container.Name}: ${container.State}`,
          );
        } catch {
          // Ignore non-JSON lines
        }
      }
    } catch {
      // Ignore parse errors
    }
  } else {
    console.log(
      `  ${chalk.gray("Docker:")}      ${chalk.yellow("not running or not installed")}`,
    );
  }

  // Services check
  console.log("");
  console.log(chalk.bold("  Service Health:\n"));

  // Check API
  try {
    const apiCheck = shell.exec(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null',
      { silent: true },
    );
    const apiUp = apiCheck.stdout.trim() === "200";
    console.log(
      `  ${apiUp ? chalk.green("●") : chalk.red("●")} Core API     ${apiUp ? chalk.green("healthy") : chalk.red("unreachable")}`,
    );
  } catch {
    console.log(`  ${chalk.red("●")} Core API     ${chalk.red("unreachable")}`);
  }

  // Check AI Service
  try {
    const aiCheck = shell.exec(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null',
      { silent: true },
    );
    const aiUp = aiCheck.stdout.trim() === "200";
    console.log(
      `  ${aiUp ? chalk.green("●") : chalk.red("●")} AI Service   ${aiUp ? chalk.green("healthy") : chalk.red("unreachable")}`,
    );
  } catch {
    console.log(`  ${chalk.red("●")} AI Service   ${chalk.red("unreachable")}`);
  }

  // Check Frontend
  try {
    const feCheck = shell.exec(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null',
      { silent: true },
    );
    const feUp = feCheck.stdout.trim() === "200";
    console.log(
      `  ${feUp ? chalk.green("●") : chalk.red("●")} Frontend     ${feUp ? chalk.green("healthy") : chalk.red("unreachable")}`,
    );
  } catch {
    console.log(`  ${chalk.red("●")} Frontend     ${chalk.red("unreachable")}`);
  }

  console.log("");
}
