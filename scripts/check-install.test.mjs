import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installProblem } from './check-install.mjs';

describe('installProblem', () => {
  it('is null when this folder has node_modules matching package.json', () => {
    assert.equal(installProblem({ hasNodeModules: true, npmLsOk: true }), null);
  });

  it('asks for npm ci when this folder has no node_modules of its own', () => {
    assert.match(
      installProblem({ hasNodeModules: false, npmLsOk: false }),
      /no node_modules in this folder.*npm ci/s,
    );
  });

  it('asks for npm ci when installed packages do not match package.json', () => {
    assert.match(
      installProblem({ hasNodeModules: true, npmLsOk: false }),
      /installed packages do not match.*npm ci/s,
    );
  });
});
