const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

const testUrl = 'postgresql://lovebyte:lovebyte@127.0.0.1:5432/lovebyte_test';

module.exports = async () => {
  const admin = new Client({
    connectionString: 'postgresql://lovebyte:lovebyte@127.0.0.1:5432/lovebyte',
  });
  await admin.connect();
  const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', ['lovebyte_test']);
  if (found.rowCount === 0) {
    await admin.query('CREATE DATABASE lovebyte_test');
  }
  await admin.end();
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testUrl },
  });
};
