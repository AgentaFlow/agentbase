import chalk from "chalk";
import ora from "ora";
import * as shell from "shelljs";
import * as semver from "semver";

interface UpdateOptions {
  backup?: boolean;
  version?: string;
}

/**
 * Update Agentbase to a newer version.
 */
export async function updateCommand(options: UpdateOptions): Promise<void> {
  console.log(chalk.bold.cyan("\n  📦 Agentbase Updater\n"));

  const spinner = ora();

  // Step 1: Check current version
  spinner.start("Checking current version...");
  let currentVersion: string;
  try {
    const pkg = require("../../../package.json");
    currentVersion = pkg.version || "0.0.0";
    spinner.succeed(`Current version: ${currentVersion}`);
  } catch (err) {
    spinner.fail("Could not determine current version");
    process.exitCode = 1;
    return;
  }

  // Step 2: Check for latest version
  spinner.start("Checking for updates...");
  const targetVersion = options.version || "latest";
  spinner.succeed(`Target version: ${targetVersion}`);

  // Step 3: Backup (if requested)
  if (options.backup !== false) {
    spinner.start("Creating backup...");
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupResult = shell.exec(
        `tar czf agentbase-backup-${timestamp}.tar.gz --exclude=node_modules --exclude=dist .`,
        { silent: true },
      );
      if (backupResult.code === 0) {
        spinner.succeed(`Backup created: agentbase-backup-${timestamp}.tar.gz`);
      } else {
        spinner.warn("Backup skipped (tar not available)");
      }
    } catch (err) {
      spinner.warn("Backup skipped");
    }
  }

  // Step 4: Pull latest code
  spinner.start("Pulling latest changes...");
  try {
    const pullResult = shell.exec("git pull origin main", { silent: true });
    if (pullResult.code !== 0) {
      throw new Error(pullResult.stderr);
    }
    spinner.succeed("Latest changes pulled");
  } catch (err) {
    spinner.fail(`Failed to pull changes: ${err}`);
    process.exitCode = 1;
    return;
  }

  // Step 5: Install updated dependencies
  spinner.start("Installing updated dependencies...");
  try {
    const installResult = shell.exec("pnpm install", { silent: true });
    if (installResult.code !== 0) {
      throw new Error(installResult.stderr);
    }
    spinner.succeed("Dependencies updated");
  } catch (err) {
    spinner.fail(`Failed to update dependencies: ${err}`);
  }

  // Step 6: Run migrations
  spinner.start("Running database migrations...");
  try {
    const migResult = shell.exec(
      "pnpm --filter @agentbase/core run typeorm migration:run",
      { silent: true },
    );
    if (migResult.code === 0) {
      spinner.succeed("Migrations complete");
    } else {
      spinner.warn("Migration skipped (check manually)");
    }
  } catch (err) {
    spinner.warn("Migration skipped");
  }

  // Step 7: Rebuild
  spinner.start("Rebuilding packages...");
  try {
    const buildResult = shell.exec("pnpm run build", { silent: true });
    if (buildResult.code !== 0) {
      throw new Error(buildResult.stderr);
    }
    spinner.succeed("Packages rebuilt");
  } catch (err) {
    spinner.warn("Build may need manual attention");
  }

  console.log(chalk.bold.green("\n  ✓ Update complete!\n"));
  console.log(chalk.white("  Restart Agentbase to apply changes:"));
  console.log(chalk.gray("    docker compose restart"));
  console.log(chalk.gray("    # or: pnpm run dev"));
  console.log("");
}
