export const meta = {
  name: 'cleanup-step',
  description: 'One step of /cleanup: find problems, verify them, apply the fixes. The cleanup skill starts it; run /cleanup instead.',
  phases: [
    { title: 'Inventory', detail: 'one agent picks the canonical choices' },
    { title: 'Find', detail: 'one agent per slice' },
    { title: 'Verify', detail: 'other agents try to disprove each finding' },
    { title: 'Fix', detail: 'one agent per group of fixes that share files' },
  ],
}

// One script for every step; SKILL.md lists the args. It never runs the full check suite: the conductor does, once.
const a = typeof args === 'string' ? JSON.parse(args) : args || {}
if (!a.rules || !a.step) throw new Error('cleanup-step needs args.rules and args.step (the text of rules.md and of the step file)')

const text = value => (typeof value === 'string' ? value : JSON.stringify(value))
const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))
// A slice is a string or an object such as { name, paths }. Agents get all of it; progress labels get its name.
const slices = a.slices && a.slices.length ? a.slices : ['the whole repository']
const label = slice => String(slice.name || text(slice)).slice(0, 40)

const context = [
  a.rules,
  `# Project brief\n${a.brief || 'None. Infer the conventions from the code.'}`,
  `# This step\n${a.step}`,
  [
    '# This run',
    a.base && `Base commit: ${a.base}`,
    `Check commands: ${text(a.checks || 'none found')}`,
    `Failing before this run (not regressions; never add to them): ${text(a.baseline || 'nothing')}`,
    `The user's untracked files (never touch): ${text(a.untracked || 'none')}`,
    a.scope && `Scope: this run is limited to ${a.scope}. Edit only files under it, plus the tests and docs for that code.`,
  ].filter(Boolean).join('\n'),
  a.earlier && `# Earlier in this run (don't raise these again, and don't apply what was deferred)\n${text(a.earlier)}`,
].filter(Boolean).join('\n\n')

const strings = { type: 'array', items: { type: 'string' } }
const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          files: { ...strings, description: 'Every source, test, and doc file the fix edits, creates, moves, or deletes. Not the dependency manifest or lockfile.' },
          symbols: strings,
          where: { type: 'string', description: 'path:line of the clearest evidence' },
          problem: { type: 'string' },
          fix: { type: 'string', description: 'The exact change, including anything it leaves unused. Empty for a decision.' },
          kind: { type: 'string', enum: ['fix', 'decision'] },
          risk: { type: 'string', enum: ['mechanical', 'behavioral'] },
          dependency: { type: 'string', enum: ['none', 'add', 'remove'] },
          options: { ...strings, description: 'For a decision: up to 3 options' },
        },
        required: ['files', 'symbols', 'where', 'problem', 'fix', 'kind', 'risk', 'dependency'],
      },
    },
  },
  required: ['findings'],
}
const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          real: { type: 'boolean' },
          reason: { type: 'string' },
          testFile: { type: 'string', description: 'Only when the fix could alter behavior and no test covers it: the test file the fix must write first' },
        },
        required: ['index', 'real', 'reason'],
      },
    },
  },
  required: ['verdicts'],
}
const RESULT = {
  type: 'object',
  properties: {
    applied: { ...strings, description: 'One line per fix: the file and what changed' },
    notApplied: { ...strings, description: '"<fix>: <reason>". Start the line with BLOCKED when a permission check stopped it.' },
    decisions: { ...strings, description: '"<file> / <symbol>: <problem> | options: <A>; <B>"' },
    untrack: { ...strings, description: 'Files to untrack' },
    env: { ...strings, description: '"<VAR_NAME>: <what it is for>"' },
    rotate: { ...strings, description: '"<secret name> found in <file>". Never the value.' },
    renamed: { ...strings, description: '"<old name> to <new name>" for each renamed symbol' },
    unusedDependencies: { ...strings, description: 'Packages your fixes left unused' },
  },
  required: ['applied', 'notApplied'],
}

const canon = a.inventory
  ? (await agent(
      `${context}

# Your job: Inventory (don't edit anything)
This step needs one view of the whole codebase before the work is split up. Start from the project brief, read what you need, and make the canonical choices this step calls for: terms, patterns, shared tokens, target structure. Return them as a short list, one line each: the choice, and one file that shows it. The agents after you apply your choices and make none of their own.`,
      { label: 'inventory', phase: 'Inventory' },
    )) || ''
  : ''

const findPrompt = (slice, i) => `${context}

# Your job: Find (don't edit anything)
Your assignment: ${text(slice)}
${
  i === 0
    ? "You also own this step's repo-wide work: analysis tools, the dependency manifest, audit commands, root config."
    : 'Skip repo-wide work (analysis tools, the dependency manifest, audit commands, root config); another agent owns it.'
}
${canon ? `\nCanonical choices for this step, already made for the whole codebase. Apply them; don't pick your own:\n${canon}\n` : ''}
Return every problem this step covers that involves your assignment. You may read any file, and a fix may touch files outside your assignment. Leave problems that belong to another step alone; each step has its own run.
- kind: "decision" for anything the rules say to return as a decision, with up to 3 options. Otherwise "fix".
- fix: concrete enough for another agent to apply without investigating again.
- risk: "mechanical" only when the project's compiler, typecheck, or linter would fail if the fix were wrong, such as an unused import or a typed rename. Deleting a file, an export, or a dependency is "behavioral", and so is anything reachable through strings, reflection, or config.
- dependency: "add" when the fix installs or upgrades a package, "remove" when it uninstalls one, otherwise "none".`

const verifyPrompt = batch => `${context}

# Your job: Verify (don't edit anything)
You didn't produce these findings. Try to disprove each one:
1. Is the problem real? Read the code; don't trust the description.
2. Does the fix keep behavior the same, or change only the defect?
3. Could the change alter behavior? Then a test must cover it. If none does, set testFile to the test file the fix must write first, with a test that passes on the current code.
For a decision, check only that the problem is real and the options are sound.
Set real to false when you can't confirm the problem, the fix is unsafe, or the finding isn't this step's job. When unsure, false. Return one verdict per finding, by index.

${JSON.stringify(batch.map((finding, index) => ({ index, ...finding })), null, 1)}`

const fixPrompt = fixes => `${context}

# Your job: Fix
Apply these verified fixes. Your files: ${[...new Set(fixes.flatMap(f => f.files))].join(', ')}
The fixes may overlap; make each change once. Another agent runs the package manager, so don't install or remove dependencies.

${JSON.stringify(fixes, null, 1)}`

const dependencyPrompt = (which, fixes, unused = []) => `${context}

# Your job: Fix (you are assigned the dependency work)
${
  which === 'add'
    ? 'Install or upgrade what these fixes need, with the package manager. Other agents edit the source after you; you only run the package manager.'
    : 'The source edits are done. Uninstall these with the package manager so the lockfile updates. First confirm nothing still uses each one; if something does, return it as not applied.'
}

${JSON.stringify(fixes.map(f => ({ problem: f.problem, fix: f.fix })), null, 1)}${unused.length ? `\nLeft unused by this step's fixes: ${unused.join(', ')}` : ''}`

const notApplied = []
let refuted = 0

// Each slice is verified as soon as its Find finishes; no waiting for the slowest slice.
const verifySlice = async (found, slice) => {
  if (!found) {
    notApplied.push(`Find didn't finish for: ${label(slice)}`)
    return []
  }
  // With trustChecks, a wrong mechanical fix fails the project's own checks, so it needs no second opinion.
  const trusted = f => a.trustChecks && f.kind === 'fix' && f.risk === 'mechanical'
  const kept = found.findings.filter(trusted)
  const batches = chunk(found.findings.filter(f => !trusted(f)), 12)
  const answers = await parallel(
    batches.map((batch, b) => () => agent(verifyPrompt(batch), { label: `verify: ${label(slice)}${batches.length > 1 ? ` #${b + 1}` : ''}`, phase: 'Verify', schema: VERDICTS })),
  )
  batches.forEach((batch, b) =>
    batch.forEach((finding, index) => {
      const verdict = answers[b] && answers[b].verdicts.find(v => v.index === index)
      if (!verdict) return notApplied.push(`not verified: ${finding.problem}`)
      if (!verdict.real) return refuted++
      if (verdict.testFile && finding.kind === 'fix') {
        if (!finding.files.includes(verdict.testFile)) finding.files.push(verdict.testFile)
        finding.fix = `First write a test in ${verdict.testFile} that passes on the current code. Then: ${finding.fix}`
        finding.risk = 'behavioral'
      }
      kept.push(finding)
    }),
  )
  return kept
}

const perSlice = await pipeline(
  slices,
  (slice, _slice, i) => agent(findPrompt(slice, i), { label: `find: ${label(slice)}`, phase: 'Find', schema: FINDINGS }),
  verifySlice,
)
perSlice.forEach((kept, i) => kept || notApplied.push(`Find or Verify failed for: ${label(slices[i])}`))
const verified = perSlice.filter(Boolean).flat()
const decisions = verified.filter(f => f.kind === 'decision')
const fixes = verified.filter(f => f.kind === 'fix')
log(`${verified.length} verified (${fixes.length} fixes, ${decisions.length} decisions), ${refuted} refuted`)

const results = []
const fix = async (prompt, opts) => {
  // agent() returns null when stopped and throws when it stalls out; either way the step goes on and the conductor's checks catch the damage.
  const result = await agent(prompt, { phase: 'Fix', schema: RESULT, ...opts }).catch(() => null)
  if (result) results.push(result)
  else notApplied.push(`${opts.label}: the agent didn't finish; its files may be half edited`)
}

// Additions and upgrades run alone first, before any group needs them.
const adds = fixes.filter(f => f.dependency === 'add')
if (adds.length) await fix(dependencyPrompt('add', adds), { label: 'fix: dependencies (add)' })

// Fixes that share a file can't run in parallel, so union them into one group.
const norm = file => file.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
const parent = new Map()
const root = key => {
  while (parent.get(key) !== key) key = parent.get(key)
  return key
}
const groups = new Map()
for (const f of fixes) {
  if (f.files.length) {
    const keys = f.files.map(norm)
    for (const key of keys) if (!parent.has(key)) parent.set(key, key)
    for (const key of keys) parent.set(root(key), root(keys[0]))
  } else if (f.dependency === 'none') notApplied.push(`${f.problem}: the finding listed no files`)
}
for (const f of fixes.filter(f => f.files.length)) {
  const key = root(norm(f.files[0]))
  groups.set(key, [...(groups.get(key) || []), f])
}
await parallel(
  [...groups.values()].map((group, g) => async () => {
    // A group of only mechanical fixes is already fully specified; it doesn't need the session's effort.
    const effort = group.every(f => f.risk === 'mechanical') ? { effort: 'low' } : {}
    const batches = chunk(group, 15)
    for (const [b, batch] of batches.entries()) await fix(fixPrompt(batch), { label: `fix: group ${g + 1}${batches.length > 1 ? ` #${b + 1}` : ''}`, ...effort })
  }),
)

// Removals run alone last, after the source stopped using them.
const collect = key => results.flatMap(r => r[key] || [])
const removes = fixes.filter(f => f.dependency === 'remove')
const unused = collect('unusedDependencies')
if (removes.length || unused.length) await fix(dependencyPrompt('remove', removes, unused), { label: 'fix: dependencies (remove)' })

return {
  applied: collect('applied'),
  notApplied: [...notApplied, ...collect('notApplied')],
  decisions: [
    ...decisions.map(f => `${f.files[0] || f.where} / ${f.symbols.join(', ') || '-'}: ${f.problem} | options: ${(f.options || []).join('; ')}`),
    ...collect('decisions'),
  ],
  untrack: collect('untrack'),
  env: collect('env'),
  rotate: collect('rotate'),
  renamed: collect('renamed'),
  canon,
  stats: { verified: verified.length, refuted, fixAgents: results.length },
}
