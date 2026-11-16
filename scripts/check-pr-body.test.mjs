import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  checkPrBody,
  templateFields,
  templateHeadings,
} from './check-pr-body.mjs';

const template = readFileSync(
  new URL('../.github/pull_request_template.md', import.meta.url),
  'utf8',
);

const GOOD = `## Intent

Does a thing.

Door: two-way

Cleanup: none

Friction: #61

## Why

Because.

## Testing

verify green.

## System recap

Risk: medium (new dep)
Touches: CI gate (adds)
`;

describe('template parsing', () => {
  it('reads headings and fields from the real template', () => {
    assert.deepEqual(templateHeadings(template), [
      'Intent',
      'Why',
      'Testing',
      'System recap',
    ]);
    assert.deepEqual(templateFields(template), [
      'Door',
      'Cleanup',
      'Friction',
      'Risk',
      'Touches',
    ]);
  });
});

describe('checkPrBody', () => {
  it('accepts a filled-in body', () => {
    assert.deepEqual(checkPrBody({ template, body: GOOD }), {
      ok: true,
      problems: [],
    });
  });

  it('rejects the untouched template', () => {
    const result = checkPrBody({ template, body: template });
    assert.equal(result.ok, false);
    assert.ok(result.problems.length >= 7);
  });

  it('rejects a body with its own headings instead of the template', () => {
    const result = checkPrBody({
      template,
      body: '## What\n\nstuff\n\n## Testing\n\nok\n\nRisk: low',
    });
    assert.equal(result.ok, false);
    assert.ok(result.problems.includes('missing section "## Intent"'));
    assert.ok(result.problems.includes('missing section "## Why"'));
  });

  it('rejects an empty body and undefined', () => {
    assert.equal(checkPrBody({ template, body: '' }).ok, false);
    assert.equal(checkPrBody({ template, body: undefined }).ok, false);
  });

  it('rejects an empty section even when other sections are filled', () => {
    const result = checkPrBody({
      template,
      body: GOOD.replace('Because.', ''),
    });
    assert.deepEqual(result.problems, ['section "## Why" is empty']);
  });

  it('rejects a field value outside the template options', () => {
    const result = checkPrBody({
      template,
      body: GOOD.replace('Door: two-way', 'Door: maybe'),
    });
    assert.equal(result.ok, false);
    assert.match(result.problems[0], /Door: maybe/);
  });

  it('requires the friction-skipped label for Friction: none', () => {
    const body = GOOD.replace('Friction: #61', 'Friction: none');
    assert.equal(checkPrBody({ template, body }).ok, false);
    assert.equal(
      checkPrBody({ template, body, labels: ['friction-skipped'] }).ok,
      true,
    );
  });

  it('requires an issue number when Cleanup is needed', () => {
    const body = GOOD.replace('Cleanup: none', 'Cleanup: needed');
    assert.equal(checkPrBody({ template, body }).ok, false);
    assert.equal(
      checkPrBody({ template, body: body.replace('needed', 'needed (#12)') })
        .ok,
      true,
    );
  });

  it('does not count text inside HTML comments as content', () => {
    const body = GOOD.replace('Because.', '<!-- Because. -->');
    assert.equal(checkPrBody({ template, body }).ok, false);
  });

  it('strips nested comment openers completely', () => {
    const body = GOOD.replace('Because.', '<!<!-- x -->-- hidden -->');
    assert.deepEqual(checkPrBody({ template, body }).problems, [
      'section "## Why" is empty',
    ]);
  });
});
