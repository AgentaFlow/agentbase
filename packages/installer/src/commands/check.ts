import * as os from "os";
import * as semver from "semver";
import chalk from "chalk";
import * as shell from "shelljs";
import ora from "ora";

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  required: boolean;
}

/**
 * Check system requirements for Agentbase installation.
 */
export async function checkCommand(): Promise<void> {
  console.log(chalk.bold("\n  Agentbase System Requirements Check\n"));

  const checks: CheckResult[] = [];

  // Node.js version
  const nodeVersion = process.version;
  const nodeOk = semver.gte(nodeVersion, "18.0.0");
  checks.push({
    name: "Node.js >= 18.0.0",
    passed: nodeOk,
    message: nodeOk
      ? `Found ${nodeVersion}`
      : `Found ${nodeVersion}, need >= 18.0.0`,
    required: true,
  });

  // npm/pnpm
  const pnpmVersion = shell.exec("pnpm --version", { silent: true });
  const hasPnpm = pnpmVersion.code === 0;
  checks.push({
    name: "pnpm (package manager)",
    passed: hasPnpm,
    message: hasPnpm
      ? `Found pnpm ${pnpmVersion.stdout.trim()}`
      : "pnpm not found. Install with: npm install -g pnpm",
    required: true,
  });

  // Python
  const pythonCheck = shell.exec(
    "python3 --version 2>&1 || python --version 2>&1",
    { silent: true },
  );
  const hasPython = pythonCheck.code === 0;
  const pythonVersion = pythonCheck.stdout.trim() || pythonCheck.stderr.trim();
  checks.push({
    name: "Python >= 3.10",
    passed: hasPython,
    message: hasPython ? `Found ${pythonVersion}` : "Python 3.10+ not found",
    required: true,
  });

  // Docker
  const dockerCheck = shell.exec("docker --version", { silent: true });
  const hasDocker = dockerCheck.code === 0;
  checks.push({
    name: "Docker",
    passed: hasDocker,
    message: hasDocker
      ? `Found ${dockerCheck.stdout.trim()}`
      : "Docker not found (optional, required for containerized deployment)",
    required: false,
  });

  // Docker Compose
  const composeCheck = shell.exec(
    "docker compose version 2>&1 || docker-compose --version 2>&1",
    { silent: true },
  );
  const hasCompose = composeCheck.code === 0;
  checks.push({
    name: "Docker Compose",
    passed: hasCompose,
    message: hasCompose
      ? `Found ${composeCheck.stdout.trim()}`
      : "Docker Compose not found (optional)",
    required: false,
  });

  // Git
  const gitCheck = shell.exec("git --version", { silent: true });
  const hasGit = gitCheck.code === 0;
  checks.push({
    name: "Git",
    passed: hasGit,
    message: hasGit ? `Found ${gitCheck.stdout.trim()}` : "Git not found",
    required: true,
  });

  // PostgreSQL client
  const pgCheck = shell.exec("psql --version", { silent: true });
  const hasPg = pgCheck.code === 0;
  checks.push({
    name: "PostgreSQL client",
    passed: hasPg,
    message: hasPg
      ? `Found ${pgCheck.stdout.trim()}`
      : "psql not found (optional, can use Docker)",
    required: false,
  });

  // System resources
  const totalMemGB = Math.round((os.totalmem() / 1073741824) * 10) / 10;
  const memOk = totalMemGB >= 2;
  checks.push({
    name: "RAM >= 2 GB",
    passed: memOk,
    message: `${totalMemGB} GB available`,
    required: true,
  });

  const cpuCount = os.cpus().length;
  const cpuOk = cpuCount >= 2;
  checks.push({
    name: "CPU cores >= 2",
    passed: cpuOk,
    message: `${cpuCount} cores available`,
    required: true,
  });

  // Display results
  let allRequired = true;
  for (const check of checks) {
    const icon = check.passed
      ? chalk.green("✓")
      : check.required
        ? chalk.red("✗")
        : chalk.yellow("⚠");
    const label = check.passed
      ? chalk.green(check.name)
      : check.required
        ? chalk.red(check.name)
        : chalk.yellow(check.name);
    console.log(`  ${icon} ${label}`);
    console.log(`    ${chalk.gray(check.message)}`);

    if (check.required && !check.passed) allRequired = false;
  }

  console.log("");
  if (allRequired) {
    console.log(
      chalk.green.bold(
        "  ✓ All required checks passed! You can proceed with installation.\n",
      ),
    );
  } else {
    console.log(
      chalk.red.bold(
        "  ✗ Some required checks failed. Please resolve them before installing.\n",
      ),
    );
    process.exitCode = 1;
  }
}
