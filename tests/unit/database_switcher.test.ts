import fs from 'fs';
import path from 'path';
import { resolveDatabaseConfig, updateDotEnvTarget } from '../../src/infrastructure/config/databaseResolver';

describe('Database Switcher & Resolver Unit Tests', () => {
  const originalEnv = { ...process.env };
  const tempEnvPath = path.resolve(__dirname, '.temp.test.env');

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    if (fs.existsSync(tempEnvPath)) {
      fs.unlinkSync(tempEnvPath);
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('1. resolves local database when DB_TARGET=local', () => {
    process.env.DB_TARGET = 'local';
    process.env.LOCAL_DATABASE_URL = 'postgresql://postgres:1324@localhost:5432/smartshule_local?schema=public';
    process.env.ONLINE_DATABASE_URL = 'postgresql://postgres.xxx:pass@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

    const config = resolveDatabaseConfig();

    expect(config.target).toBe('local');
    expect(config.databaseUrl).toBe(process.env.LOCAL_DATABASE_URL);
    expect(config.isCloud).toBe(false);
    expect(config.host).toBe('localhost');
    expect(config.port).toBe('5432');
    expect(config.databaseName).toBe('smartshule_local');
    expect(config.maskedUrl).toContain(':****@');
    expect(process.env.DATABASE_URL).toBe(config.databaseUrl);
  });

  it('2. resolves online database when DB_TARGET=online', () => {
    process.env.DB_TARGET = 'online';
    process.env.LOCAL_DATABASE_URL = 'postgresql://postgres:1324@localhost:5432/smartshule_local?schema=public';
    process.env.ONLINE_DATABASE_URL = 'postgresql://postgres.xxx:mysecretpassword@aws-1-eu-west-1.pooler.supabase.com:6543/postgres_cloud?pgbouncer=true';

    const config = resolveDatabaseConfig();

    expect(config.target).toBe('online');
    expect(config.databaseUrl).toBe(process.env.ONLINE_DATABASE_URL);
    expect(config.isCloud).toBe(true);
    expect(config.host).toBe('aws-1-eu-west-1.pooler.supabase.com');
    expect(config.port).toBe('6543');
    expect(config.databaseName).toBe('postgres_cloud');
    expect(config.maskedUrl).not.toContain('mysecretpassword');
    expect(config.maskedUrl).toContain(':****@');
  });

  it('3. supports aliases: cloud, remote, prod, dev', () => {
    process.env.LOCAL_DATABASE_URL = 'postgresql://postgres:pass@127.0.0.1:5432/smartshule';
    process.env.ONLINE_DATABASE_URL = 'postgresql://postgres:pass@remote-host.com:5432/smartshule';

    process.env.DB_TARGET = 'dev';
    expect(resolveDatabaseConfig().target).toBe('local');

    process.env.DB_TARGET = 'cloud';
    expect(resolveDatabaseConfig().target).toBe('online');

    process.env.DB_TARGET = 'remote';
    expect(resolveDatabaseConfig().target).toBe('online');
  });

  it('4. infers target when DB_TARGET is not explicitly specified', () => {
    delete process.env.DB_TARGET;
    delete process.env.DATABASE_TARGET;
    delete process.env.DB_ENV;

    // Localhost in DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://postgres:pass@localhost:5432/smartshule';
    expect(resolveDatabaseConfig().target).toBe('local');

    // Cloud in DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://postgres:pass@supabase.com:6543/postgres';
    expect(resolveDatabaseConfig().target).toBe('online');
  });

  it('5. safely updates an environment file using updateDotEnvTarget', () => {
    const initialEnvContent = [
      'PORT=3000',
      '# 2. DATABASE CONFIGURATION',
      'DB_TYPE=postgres',
      'DB_TARGET=online',
      'LOCAL_DATABASE_URL="postgresql://postgres:1234@localhost:5432/smartshule_test"',
      'LOCAL_DIRECT_URL="postgresql://postgres:1234@localhost:5432/smartshule_test"',
      'ONLINE_DATABASE_URL="postgresql://postgres:pass@online-host.com:5432/smartshule_cloud"',
      'ONLINE_DIRECT_URL="postgresql://postgres:pass@online-host.com:5432/smartshule_cloud"',
      'DATABASE_URL="postgresql://postgres:pass@online-host.com:5432/smartshule_cloud"',
      'DIRECT_URL="postgresql://postgres:pass@online-host.com:5432/smartshule_cloud"'
    ].join('\n');

    fs.writeFileSync(tempEnvPath, initialEnvContent, 'utf-8');

    // Switch to local
    const switchRes = updateDotEnvTarget('local', tempEnvPath);
    expect(switchRes.success).toBe(true);

    const updatedContent = fs.readFileSync(tempEnvPath, 'utf-8');
    expect(updatedContent).toContain('DB_TARGET=local');
    expect(updatedContent).toContain('DATABASE_URL="postgresql://postgres:1234@localhost:5432/smartshule_test"');
    expect(updatedContent).toContain('DIRECT_URL="postgresql://postgres:1234@localhost:5432/smartshule_test"');

    // Switch back to online
    const switchBackRes = updateDotEnvTarget('online', tempEnvPath);
    expect(switchBackRes.success).toBe(true);

    const finalContent = fs.readFileSync(tempEnvPath, 'utf-8');
    expect(finalContent).toContain('DB_TARGET=online');
    expect(finalContent).toContain('DATABASE_URL="postgresql://postgres:pass@online-host.com:5432/smartshule_cloud"');
  });
});
