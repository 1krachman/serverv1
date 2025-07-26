const { createDefaultPreset } = require('ts-jest');

const tsJestPreset = createDefaultPreset();

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',                      // <-- penting agar Jest tahu ini TypeScript
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],            // <-- cari semua file test.ts
  transform: {
    ...tsJestPreset.transform,
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
