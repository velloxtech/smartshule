import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { resolveDatabaseConfig, updateDotEnvTarget } from '../src/infrastructure/config/databaseResolver';

// Load existing .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testConnection(connectionString: string, isCloud: boolean): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
  const start = Date.now();
  const pool = new Pool({
    connectionString,
    ssl: isCloud ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000
  });

  try {
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    await pool.end();
    return { success: true, latencyMs };
  } catch (err: any) {
    await pool.end().catch(() => null);
    return { success: false, error: err.message };
  }
}

async function main() {
  const arg = (process.argv[2] || '').toLowerCase().trim();

  if (['local', 'localhost', 'dev'].includes(arg)) {
    const res = updateDotEnvTarget('local');
    console.log('----------------------------------------------------');
    console.log(`✅ ${res.message}`);
    console.log('----------------------------------------------------');
  } else if (['online', 'cloud', 'remote', 'prod'].includes(arg)) {
    const res = updateDotEnvTarget('online');
    console.log('----------------------------------------------------');
    console.log(`✅ ${res.message}`);
    console.log('----------------------------------------------------');
  } else if (arg && arg !== 'status') {
    console.log(`❌ Unknown argument '${arg}'. Available options: 'local' | 'online' | 'status'`);
    process.exit(1);
  }

  // Display status
  const config = resolveDatabaseConfig();

  console.log('====================================================');
  console.log('🗄️  SMARTSHULE DATABASE STATUS & TARGET');
  console.log('====================================================');
  console.log(`Active Target : ${config.target.toUpperCase()}`);
  console.log(`Database Host : ${config.host}`);
  console.log(`Port          : ${config.port}`);
  console.log(`Database Name : ${config.databaseName}`);
  console.log(`User          : ${config.user}`);
  console.log(`SSL Required  : ${config.isCloud ? 'YES (Cloud SSL enabled)' : 'NO (Direct Local)'}`);
  console.log(`URL (Masked)  : ${config.maskedUrl}`);
  console.log('----------------------------------------------------');

  console.log('Testing database connection...');
  const connResult = await testConnection(config.databaseUrl, config.isCloud);
  if (connResult.success) {
    console.log(`🟢 Connection SUCCESSFUL (${connResult.latencyMs}ms)`);
  } else {
    console.log(`🔴 Connection FAILED: ${connResult.error}`);
    if (config.target === 'local') {
      console.log('👉 Tip: Ensure your local PostgreSQL service is running on port 5432.');
    }
  }
  console.log('====================================================');
}

main().catch(err => {
  console.error('Error executing database switch:', err);
  process.exit(1);
});
