import fs from 'fs';
import path from 'path';

export type DatabaseTarget = 'local' | 'online';

export interface ResolvedDatabaseConfig {
  target: DatabaseTarget;
  databaseUrl: string;
  directUrl: string;
  isCloud: boolean;
  host: string;
  port: string;
  databaseName: string;
  user: string;
  maskedUrl: string;
}

/**
 * Strips surrounding quotation marks and trims whitespace
 */
function cleanConnectionString(url?: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/**
 * Extracts connection details for logging and verification
 */
function parsePostgresUrl(connectionString: string): {
  host: string;
  port: string;
  databaseName: string;
  user: string;
  maskedUrl: string;
} {
  try {
    const url = new URL(connectionString.replace(/^postgresql:\/\//, 'http://'));
    const host = url.hostname || 'localhost';
    const port = url.port || '5432';
    const databaseName = url.pathname.replace(/^\//, '') || 'postgres';
    const user = url.username || 'postgres';
    const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
    return { host, port, databaseName, user, maskedUrl };
  } catch {
    const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
    return {
      host: 'unknown',
      port: '5432',
      databaseName: 'smartshule',
      user: 'postgres',
      maskedUrl
    };
  }
}

/**
 * Resolves the active database configuration based on DB_TARGET in .env
 * Supported DB_TARGET values:
 * - 'local' | 'localhost' | 'dev' | 'development' => Uses LOCAL_DATABASE_URL / LOCAL_DIRECT_URL
 * - 'online' | 'cloud' | 'remote' | 'prod' | 'production' => Uses ONLINE_DATABASE_URL / ONLINE_DIRECT_URL
 * - Fallback if DB_TARGET is not specified => Uses DATABASE_URL / DIRECT_URL
 */
export function resolveDatabaseConfig(): ResolvedDatabaseConfig {
  const rawTarget = (
    process.env.DB_TARGET ||
    process.env.DATABASE_TARGET ||
    process.env.DB_ENV ||
    ''
  ).toLowerCase().trim();

  const localDbUrl = cleanConnectionString(process.env.LOCAL_DATABASE_URL);
  const localDirectUrl = cleanConnectionString(process.env.LOCAL_DIRECT_URL) || localDbUrl;

  const onlineDbUrl = cleanConnectionString(process.env.ONLINE_DATABASE_URL);
  const onlineDirectUrl = cleanConnectionString(process.env.ONLINE_DIRECT_URL) || onlineDbUrl;

  const defaultDbUrl = cleanConnectionString(process.env.DATABASE_URL);
  const defaultDirectUrl = cleanConnectionString(process.env.DIRECT_URL) || defaultDbUrl;

  let target: DatabaseTarget = 'online';
  let databaseUrl = '';
  let directUrl = '';

  if (['local', 'localhost', 'dev', 'development'].includes(rawTarget)) {
    target = 'local';
    databaseUrl = localDbUrl || defaultDbUrl || 'postgresql://postgres:postgres@localhost:5432/smartshule?schema=public';
    directUrl = localDirectUrl || databaseUrl;
  } else if (['online', 'cloud', 'remote', 'prod', 'production'].includes(rawTarget)) {
    target = 'online';
    databaseUrl = onlineDbUrl || defaultDbUrl;
    directUrl = onlineDirectUrl || defaultDirectUrl || databaseUrl;
  } else {
    // No explicit DB_TARGET: infer from DATABASE_URL
    if (
      defaultDbUrl.includes('localhost') ||
      defaultDbUrl.includes('127.0.0.1') ||
      defaultDbUrl.includes('@postgres:')
    ) {
      target = 'local';
      databaseUrl = defaultDbUrl || localDbUrl;
      directUrl = defaultDirectUrl || localDirectUrl || databaseUrl;
    } else {
      target = 'online';
      databaseUrl = defaultDbUrl || onlineDbUrl;
      directUrl = defaultDirectUrl || onlineDirectUrl || databaseUrl;
    }
  }

  // Ensure databaseUrl is clean
  databaseUrl = cleanConnectionString(databaseUrl);
  directUrl = cleanConnectionString(directUrl) || databaseUrl;

  const parsed = parsePostgresUrl(databaseUrl);
  const isCloud =
    target === 'online' &&
    !parsed.host.includes('localhost') &&
    !parsed.host.includes('127.0.0.1');

  // Synchronize process.env for all libraries, Prisma, and connection pools
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = directUrl;
  process.env.ACTIVE_DB_TARGET = target;

  return {
    target,
    databaseUrl,
    directUrl,
    isCloud,
    host: parsed.host,
    port: parsed.port,
    databaseName: parsed.databaseName,
    user: parsed.user,
    maskedUrl: parsed.maskedUrl
  };
}

/**
 * Safely updates or creates variables in the root .env file without altering unrelated configurations
 */
export function updateDotEnvTarget(newTarget: DatabaseTarget, envFilePath?: string): { success: boolean; message: string } {
  const filePath = envFilePath || path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(filePath)) {
    return { success: false, message: `File not found at ${filePath}` };
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Update DB_TARGET
  if (/^DB_TARGET=.*/m.test(content)) {
    content = content.replace(/^DB_TARGET=.*/m, `DB_TARGET=${newTarget}`);
  } else if (/^#\s*DB_TARGET=.*/m.test(content)) {
    content = content.replace(/^#\s*DB_TARGET=.*/m, `DB_TARGET=${newTarget}`);
  } else {
    // Append DB_TARGET under DATABASE CONFIGURATION if possible
    if (content.includes('DATABASE CONFIGURATION')) {
      content = content.replace(/(#\s*2\.\s*DATABASE CONFIGURATION[^\n]*\n)/i, `$1DB_TARGET=${newTarget}\n`);
    } else {
      content = `DB_TARGET=${newTarget}\n` + content;
    }
  }

  // Reload process.env so that resolveDatabaseConfig computes using the new target
  process.env.DB_TARGET = newTarget;
  const resolved = resolveDatabaseConfig();

  // Update DATABASE_URL and DIRECT_URL in the file to match the newly active target
  if (/^DATABASE_URL=.*/m.test(content)) {
    content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${resolved.databaseUrl}"`);
  }

  if (/^DIRECT_URL=.*/m.test(content)) {
    content = content.replace(/^DIRECT_URL=.*/m, `DIRECT_URL="${resolved.directUrl}"`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    success: true,
    message: `Successfully switched active database to '${newTarget.toUpperCase()}' (${resolved.host}:${resolved.port}/${resolved.databaseName})`
  };
}
