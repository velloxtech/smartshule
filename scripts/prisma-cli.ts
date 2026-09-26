import dotenv from 'dotenv';
import path from 'path';
import { spawn } from 'child_process';
import { resolveDatabaseConfig } from '../src/infrastructure/config/databaseResolver';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Resolve active DB target
const config = resolveDatabaseConfig();

console.log(`[Prisma Runner] Target: ${config.target.toUpperCase()} | Host: ${config.host}:${config.port}/${config.databaseName}`);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please specify a prisma command, e.g.: db push, generate, studio');
  process.exit(1);
}

const envVars = {
  ...process.env,
  DATABASE_URL: config.databaseUrl,
  DIRECT_URL: config.directUrl
};

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npx, ['prisma', ...args], {
  env: envVars,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
