import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // In-memory SQLite: the full app runs in CI without a Postgres service.
    env: { DB_TYPE: 'sqljs', DB_SYNC: 'true', JWT_SECRET: 'test-secret' },
  },
});
