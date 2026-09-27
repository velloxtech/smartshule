import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL ||
    `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'smartshule_db'}`;

  console.log(`Connecting to database...`);
  const pool = new Pool({ connectionString });

  try {
    const email = 'admin@';
    const plainPassword = 'admin@123';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const sql = `
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone, status, school_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW();
    `;

    const values = [
      'usr-superadmin-admin-at',
      email,
      passwordHash,
      'Super',
      'Admin',
      'SUPER_ADMIN',
      '+254700000000',
      'ACTIVE',
      null
    ];

    await pool.query(sql, values);
    console.log(`[SUCCESS] Super Admin account created/updated:`);
    console.log(`- Username/Email: ${email}`);
    console.log(`- Password: ${plainPassword}`);
    console.log(`- Password Hash: ${passwordHash}`);
    console.log(`- Role: SUPER_ADMIN`);
  } catch (error) {
    console.error('[ERROR] Failed to insert user:', error);
  } finally {
    await pool.end();
  }
}

main();
