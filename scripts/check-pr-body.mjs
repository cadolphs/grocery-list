#!/usr/bin/env node
// Fail a PR whose body does not follow .github/pull_request_template.md.
// The required headings and field names are read from the template itself,
// so this check cannot drift from it. Risk tier correctness is checked
// separately (check-risk-tier.mjs); here Risk only has to be filled in.
//
// Zero npm dependencies; Node built-ins only.
//
// Usage (CI):
//   PR_BODY="$body" PR_LABELS='["friction-skipped"]' node scripts/check-pr-body.mjs
//
// Exit codes: 0 ok, 1 body does not follow the template, 2 unexpected error.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TEMPLATE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.github',
  'pull_request_template.md',
);

// Repeat until stable so nested input like `<!<!-- x -->--` cannot leave a
// comment opener behind.
const stripComments = (text) => {
  const next = text.replace(/<!--[\s\S]*?-->/g, '');
  return next === text ? text : stripComments(next);
};

// `## Heading` lines of the template, in order.
export const templateHeadings = (template) =>
  [...stripComments(template).matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);

// `Name: <!-- hint -->` lines of the template (comment kept in the raw text).
export const templateFields = (template) =>
  [...template.matchAll(/^([A-Z][A-Za-z]*):\s*<!--/gm)].map((m) => m[1]);

// Text under `## heading`, comments removed, up to the next `## ` heading.
const sectionText = (body, heading) => {
  const clean = stripComments(body);
  const parts = clean.split(/^##\s+/m).slice(1);
  const part = parts.find((p) => p.split('\n')[0].trim() === heading);
  // Field lines (`Door: two-way`) are not prose; only count free text.
  return part
    ? part
        .split('\n')
        .slice(1)
        .filter((line) => !/^[A-Z][A-Za-z]*:/.test(line))
        .join('\n')
    : null;
};

const fieldValue = (body, name) => {
  const match = new RegExp(`^${name}:[ \\t]*(.*)$`, 'm').exec(
    stripComments(body),
  );
  return match ? match[1].trim() : null;
};

// Allowed shapes for fields whose template hint lists the options. Fields
// not listed here only have to be non-empty.
const FIELD_PATTERNS = {
  Door: /^(two-way|one-way)\b/i,
  Cleanup: /^(none|needed\b.*#\d+|done)\b/i,
  Friction: /^(#\d+|none)\b/i,
  Risk: /^(low|medium|high)\b/i,
};

export const checkPrBody = ({ template, body, labels = [] }) => {
  const problems = [];
  const text = body ?? '';

  for (const heading of templateHeadings(template)) {
    const content = sectionText(text, heading);
    if (content === null) problems.push(`missing section "## ${heading}"`);
    else if (heading !== 'System recap' && content.trim() === '')
      problems.push(`section "## ${heading}" is empty`);
  }

  for (const name of templateFields(template)) {
    const value = fieldValue(text, name);
    if (value === null || value === '') {
      problems.push(`field "${name}:" is missing or unfilled`);
      continue;
    }
    const pattern = FIELD_PATTERNS[name];
    if (pattern && !pattern.test(value))
      problems.push(
        `field "${name}: ${value}" does not match the template's options`,
      );
  }

  const friction = fieldValue(text, 'Friction');
  if (/^none\b/i.test(friction ?? '') && !labels.includes('friction-skipped'))
    problems.push(
      'Friction: none needs the `friction-skipped` label (or file the friction issue and write its number)',
    );

  return { ok: problems.length === 0, problems };
};

const main = () => {
  const result = checkPrBody({
    template: readFileSync(TEMPLATE, 'utf8'),
    body: process.env.PR_BODY,
    labels: JSON.parse(process.env.PR_LABELS ?? '[]'),
  });
  if (result.ok) {
    console.log('OK: PR body follows .github/pull_request_template.md');
    process.exit(0);
  }
  console.error('PR body does not follow .github/pull_request_template.md:');
  for (const problem of result.problems) console.error(`  - ${problem}`);
  process.exit(1);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (err) {
    console.error('check-pr-body: unexpected error');
    console.error(err);
    process.exit(2);
  }
}
