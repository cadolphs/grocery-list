#!/usr/bin/env node
// planning board CLI: read and move items on the GitHub project that holds
// product ideas. Resolves the project, Status field, and options by name, so
// renaming a stage on GitHub needs no change here.
// See docs/planning-board.md and .claude/skills/planning-board/SKILL.md.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OWNER = 'cadolphs';
const PROJECT_NUMBER = 4;
const DECIDED = 'decided';
const IN_PROGRESS = 'in progress';

// ---------- pure helpers ----------

export const parseArgs = (argv) =>
  argv.reduce(
    (acc, token, index, all) => {
      if (acc.skip) return { ...acc, skip: false };
      if (!token.startsWith('--')) {
        return { ...acc, positional: [...acc.positional, token] };
      }
      const next = all[index + 1];
      const isValue = next !== undefined && !next.startsWith('--');
      return {
        ...acc,
        flags: { ...acc.flags, [token.slice(2)]: isValue ? next : true },
        skip: isValue,
      };
    },
    { positional: [], flags: {}, skip: false },
  );

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const findStatus = (options, name) =>
  options.find((option) => same(option.name, name));

// An item is addressed by its list number, its id, or a unique part of its title.
export const findItem = (items, ref) => {
  const byNumber = /^\d+$/.test(ref) ? items[Number(ref) - 1] : undefined;
  if (byNumber) return { item: byNumber };
  const byId = items.find((item) => item.id === ref);
  if (byId) return { item: byId };
  const matches = items.filter((item) =>
    item.title.toLowerCase().includes(ref.toLowerCase()),
  );
  if (matches.length === 1) return { item: matches[0] };
  return {
    error:
      matches.length === 0
        ? `no item matches "${ref}"`
        : `"${ref}" matches ${matches.length} items: ${matches.map((item) => item.title).join(' | ')}`,
  };
};

// Add a line under a `## Heading`, creating the section at the end if missing.
export const addUnderHeading = (body, heading, line) => {
  const lines = (body ?? '').split('\n');
  if (lines.some((existing) => existing.trim() === line.trim())) {
    return lines.join('\n');
  }
  const start = lines.findIndex((existing) => same(existing, `## ${heading}`));
  if (start === -1) {
    const base = (body ?? '').trimEnd();
    return `${base}${base ? '\n\n' : ''}## ${heading}\n\n${line}\n`;
  }
  const nextHeading = lines.findIndex(
    (existing, index) => index > start && existing.startsWith('## '),
  );
  const end = nextHeading === -1 ? lines.length : nextHeading;
  const lastContent = lines
    .slice(start + 1, end)
    .reduce(
      (last, existing, offset) => (existing.trim() ? start + 1 + offset : last),
      start,
    );
  const insert = lastContent === start ? ['', line] : [line];
  return [
    ...lines.slice(0, lastContent + 1),
    ...insert,
    ...lines.slice(lastContent + 1),
  ].join('\n');
};

// What a move needs beyond the target status. Returns an error or body edits.
export const moveRequirements = (status, flags, today) => {
  if (same(status, DECIDED)) {
    return typeof flags['maintainer-said'] === 'string'
      ? {
          edits: [
            [
              'Decisions',
              `- ${today}: moved to ${status}. Maintainer: "${flags['maintainer-said']}"`,
            ],
          ],
        }
      : {
          error: `only the maintainer moves an item to ${status}: pass --maintainer-said "<their words>"`,
        };
  }
  if (same(status, IN_PROGRESS)) {
    const issues = String(flags.issue ?? '')
      .split(',')
      .map((issue) => issue.trim().replace(/^#/, ''))
      .filter(Boolean);
    return issues.length > 0 && issues.every((issue) => /^\d+$/.test(issue))
      ? { edits: issues.map((issue) => ['Issues', `- #${issue}`]) }
      : {
          error: `${status} needs the development issue(s): pass --issue <number>[,<number>]`,
        };
  }
  return { edits: [] };
};

export const toItem = (node) => ({
  id: node.id,
  status: node.fieldValueByName?.name ?? '(no status)',
  kind: node.content?.__typename ?? 'Unknown',
  contentId: node.content?.id,
  number: node.content?.number,
  url: node.content?.url,
  title: node.content?.title ?? '(untitled)',
  body: node.content?.body ?? '',
});

// ---------- GitHub ----------

const gh = (query, variables = {}) => {
  const args = Object.entries(variables).flatMap(([key, value]) => [
    typeof value === 'number' ? '-F' : '-f',
    `${key}=${value}`,
  ]);
  const result = spawnSync(
    'gh',
    ['api', 'graphql', '-f', `query=${query}`, ...args],
    { encoding: 'utf8' },
  );
  if (result.error) throw new Error(`cannot run gh: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = `${result.stderr}${result.stdout}`.trim();
    throw new Error(
      /scope|not accessible|Could not resolve to a ProjectV2/i.test(detail)
        ? `the gh token cannot reach the board (needs the "project" scope: gh auth refresh -s project). Put the notes in the PR or issue instead.\n${detail}`
        : detail,
    );
  }
  return JSON.parse(result.stdout).data;
};

const BOARD_QUERY = `query($owner: String!, $number: Int!) {
  user(login: $owner) { projectV2(number: $number) {
    id url
    field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name description } } }
    items(first: 100) { nodes {
      id
      fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
      content { __typename
        ... on DraftIssue { id title body }
        ... on Issue { number title url body }
        ... on PullRequest { number title url body }
      }
    } }
  } }
}`;

const loadBoard = () => {
  const project = gh(BOARD_QUERY, { owner: OWNER, number: PROJECT_NUMBER }).user
    .projectV2;
  const options = project.field.options;
  const order = (item) => {
    const index = options.findIndex((option) => option.name === item.status);
    return index === -1 ? options.length : index;
  };
  return {
    id: project.id,
    url: project.url,
    fieldId: project.field.id,
    options,
    items: project.items.nodes.map(toItem).sort((a, b) => order(a) - order(b)),
  };
};

const setStatus = (board, itemId, optionId) =>
  gh(
    `mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
      updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option } }) { projectV2Item { id } }
    }`,
    { project: board.id, item: itemId, field: board.fieldId, option: optionId },
  );

const setBody = (item, body) => {
  if (item.kind !== 'DraftIssue') {
    throw new Error(
      `"${item.title}" is a repo ${item.kind}, not a draft item: edit it with gh issue edit ${item.number}`,
    );
  }
  return gh(
    `mutation($id: ID!, $body: String!) {
      updateProjectV2DraftIssue(input: { draftIssueId: $id, body: $body }) { draftIssue { id } }
    }`,
    { id: item.contentId, body },
  );
};

// ---------- commands ----------

const statusNames = (board) =>
  board.options.map((option) => option.name).join(', ');

const requireStatus = (board, name) => {
  const option = name ? findStatus(board.options, name) : undefined;
  if (!option) {
    throw new Error(
      `unknown status "${name ?? ''}". Statuses: ${statusNames(board)}`,
    );
  }
  return option;
};

const requireItem = (board, ref) => {
  if (!ref) throw new Error('which item? Pass its list number or title.');
  const { item, error } = findItem(board.items, ref);
  if (error) throw new Error(error);
  return item;
};

const readBody = (flags) => {
  if (typeof flags['body-file'] === 'string') {
    return readFileSync(flags['body-file'], 'utf8');
  }
  return typeof flags.body === 'string' ? flags.body : undefined;
};

const print = (flags, value, text) =>
  console.log(flags.json ? JSON.stringify(value, null, 2) : text);

const commands = {
  statuses: ({ flags }) => {
    const board = loadBoard();
    print(
      flags,
      board.options,
      board.options
        .map((option) => `${option.name}: ${option.description}`)
        .join('\n'),
    );
  },

  list: ({ flags }) => {
    const board = loadBoard();
    const wanted =
      typeof flags.status === 'string'
        ? requireStatus(board, flags.status).name
        : undefined;
    const rows = board.items
      .map((item, index) => ({ ...item, position: index + 1 }))
      .filter((row) => !wanted || row.status === wanted);
    print(
      flags,
      rows,
      rows.length === 0
        ? `no items${wanted ? ` in ${wanted}` : ''} (${board.url})`
        : rows
            .map(
              (row) =>
                `${String(row.position).padStart(2)}  ${row.status.padEnd(12)} ${row.title}${row.kind === 'DraftIssue' ? '' : ` (#${row.number})`}`,
            )
            .join('\n'),
    );
  },

  show: ({ positional, flags }) => {
    const item = requireItem(loadBoard(), positional[0]);
    print(
      flags,
      item,
      `# ${item.title}\nStatus: ${item.status}${item.url ? `\n${item.url}` : ''}\n\n${item.body}`,
    );
  },

  add: ({ positional, flags }) => {
    const title = positional[0];
    if (!title) throw new Error('add needs a title: add "<idea>"');
    const board = loadBoard();
    const status = requireStatus(board, flags.status ?? board.options[0].name);
    const needs = moveRequirements(status.name, flags, '');
    if (needs.error || needs.edits.length > 0) {
      throw new Error(`add an item as ${board.options[0].name}, then move it`);
    }
    const created = gh(
      `mutation($project: ID!, $title: String!, $body: String!) {
        addProjectV2DraftIssue(input: { projectId: $project, title: $title, body: $body }) { projectItem { id } }
      }`,
      { project: board.id, title, body: readBody(flags) ?? '' },
    ).addProjectV2DraftIssue.projectItem;
    setStatus(board, created.id, status.id);
    print(
      flags,
      { id: created.id, status: status.name, title },
      `added "${title}" as ${status.name}`,
    );
  },

  move: ({ positional, flags }) => {
    const board = loadBoard();
    const item = requireItem(board, positional[0]);
    const status = requireStatus(board, positional[1]);
    const today = new Date().toISOString().slice(0, 10);
    const needs = moveRequirements(status.name, flags, today);
    if (needs.error) throw new Error(needs.error);
    if (needs.edits.length > 0) {
      setBody(
        item,
        needs.edits.reduce(
          (body, [heading, line]) => addUnderHeading(body, heading, line),
          item.body,
        ),
      );
    }
    setStatus(board, item.id, status.id);
    print(
      flags,
      { id: item.id, from: item.status, to: status.name, title: item.title },
      `moved "${item.title}": ${item.status} -> ${status.name}`,
    );
  },

  body: ({ positional, flags }) => {
    const item = requireItem(loadBoard(), positional[0]);
    const body = readBody(flags);
    if (body === undefined) {
      throw new Error('body needs --body-file <path> or --body "<text>"');
    }
    setBody(item, body);
    print(flags, { id: item.id, title: item.title }, `updated "${item.title}"`);
  },
};

const USAGE = `usage: npm run board -- <command>
  list [--status <status>]           items, in stage order
  show <item>                        title, status, body
  add "<title>" [--body-file <path>] log an idea in the first stage
  body <item> --body-file <path>     replace an item's body
  move <item> <status>               Decided needs --maintainer-said "<words>"
                                     In progress needs --issue <n>[,<n>]
  statuses                           stage names and meanings
<item> is the number from list, or a unique part of the title. Add --json for JSON.`;

const main = (argv) => {
  const [name, ...rest] = argv;
  const command = commands[name];
  if (!command) {
    console.log(USAGE);
    return name && name !== 'help' ? 1 : 0;
  }
  try {
    command(parseArgs(rest));
    return 0;
  } catch (error) {
    console.error(`✗ ${error.message}`);
    return 1;
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
