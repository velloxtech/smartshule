process.env.NODE_ENV = 'test';
process.env.SMS_PROVIDER = 'simulator';
process.env.DB_TYPE = 'in-memory';
process.env.EMAIL_TEST_MODE = 'true';
process.env.PAYSTACK_SECRET_KEY = 'smartshule_paystack';

const fs = require('fs');
const os = require('os');
const path = require('path');
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartshule-tests-'));
process.env.WHATSAPP_SESSION_PATH = path.join(testDataDir, 'whatsapp_session');
process.env.WHATSAPP_CONFIG_PATH = path.join(testDataDir, 'whatsapp_meta_config.json');
process.env.UPLOAD_DIR = path.join(testDataDir, 'uploads');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Real-database suites require an explicitly provisioned disposable database.
  testPathIgnorePatterns: process.env.RUN_DATABASE_TESTS === 'true'
    ? ['/node_modules/']
    : ['/node_modules/', 'postgres_', '_local.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/isolateTestState.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }]
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

