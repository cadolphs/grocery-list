/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // Full scope (`npm run mutation -- --all`). `npm run mutation` narrows it to
  // the files changed versus main with `--mutate` (see scripts/mutation.mjs).
  mutate: ['src/domain/**/*.ts', 'src/ports/**/*.ts', '!src/**/*.test.ts'],
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'package.json',
  },
  checkers: [],
  reporters: ['clear-text', 'html'],
  // Static mutants (module-level constants) force a full test-suite run per
  // mutant; they were 17% of mutants but 73% of run time and timed CI out.
  ignoreStatic: true,
  thresholds: {
    high: 90,
    low: 80,
    break: 80,
  },
  timeoutMS: 30000,
  concurrency: 2,
};
