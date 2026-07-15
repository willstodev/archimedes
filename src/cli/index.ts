const commands = [
  "db:backup",
  "db:restore",
  "import:legacy",
  "sources:sync",
  "search:jobs",
  "search:recruiters",
  "jobs:list",
  "applications:update",
  "outreach:update",
  "report:daily",
  "tokens:report"
] as const;

function printHelp(): void {
  console.log(`Archimedes local CLI

Usage:
  pnpm <command> -- [options]
  pnpm cli -- <command> [options]

Commands:
${commands.map((command) => `  ${command}`).join("\n")}

Most workflow commands are intentionally stubbed until their module services are implemented.
State-changing commands must require explicit confirmation before mutating application or outreach state.`);
}

function normalizeArgv(argv: string[]): string[] {
  return argv[0] === "--" ? argv.slice(1) : argv;
}

function main(rawArgv: string[]): number {
  const argv = normalizeArgv(rawArgv);
  const [command, ...args] = argv;

  if (command === undefined || ["--help", "-h"].includes(command)) {
    printHelp();
    return 0;
  }

  if (!commands.includes(command as (typeof commands)[number])) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    return 1;
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${command}: not implemented yet`);
    return 0;
  }

  console.error(`${command} is not implemented yet.`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
