// Checks the plugin's parts that can run without agents: the workflow script (against stubs), the hook guard,
// and the manifests. Run: node test/step-workflow.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = readFileSync(join(root, 'workflows/cleanup-step.js'), 'utf8').replace('export const meta', 'const meta')
const script = new (async () => {}).constructor('args', 'agent', 'parallel', 'pipeline', 'log', source)

async function run(args, respond) {
  const calls = []
  const agent = async (prompt, opts = {}) => {
    calls.push({ prompt, ...opts })
    return respond(prompt, opts)
  }
  const parallel = thunks => Promise.all(thunks.map(thunk => Promise.resolve().then(thunk).catch(() => null)))
  const pipeline = (items, ...stages) =>
    Promise.all(
      items.map(async (item, i) => {
        try {
          let value = item
          for (const stage of stages) value = await stage(value, item, i)
          return value
        } catch {
          return null
        }
      }),
    )
  return { result: await script(args, agent, parallel, pipeline, () => {}), calls }
}

const finding = (files, extra = {}) => ({ files, symbols: ['s'], where: `${files[0]}:1`, problem: `p ${files}`, fix: 'do it', kind: 'fix', risk: 'behavioral', dependency: 'none', ...extra })
const base = { rules: 'RULES', step: 'STEP' }

// Nothing found: no Verify or Fix agent starts.
{
  const { result, calls } = await run({ ...base, slices: ['a', 'b'] }, () => ({ findings: [] }))
  assert.deepEqual(calls.map(c => c.phase), ['Find', 'Find'])
  assert.deepEqual(result.applied, [])
}

// The full path.
{
  const found = {
    'find: a': [finding(['src/x.js'], { risk: 'mechanical' }), finding(['src/x.js', 'src/y.js']), finding(['src/z.js'], { kind: 'decision', decision: { question: 'Q?', today: 'T', evidence: 'E', options: [{ does: 'A', advantage: 'safer', disadvantage: 'slower' }, { does: 'B', advantage: 'no work', disadvantage: 'the problem stays' }], suggested: 'A' } })],
    'find: b': [finding(['.\\SRC\\y.js']), finding(['src/w.js']), finding([], { dependency: 'remove' }), finding(['src/q.js'], { risk: 'mechanical', dependency: 'add' })],
  }
  const verdicts = {
    'verify: a': [{ index: 0, real: true, reason: '', testFile: 'test/x.test.js' }, { index: 1, real: true, reason: '' }],
    'verify: b': [{ index: 0, real: true, reason: '' }, { index: 1, real: false, reason: 'still used' }, { index: 2, real: true, reason: '' }],
  }
  const { result, calls } = await run({ ...base, slices: ['a', 'b'], inventory: true, trustChecks: true }, (prompt, opts) => {
    if (opts.phase === 'Inventory') return 'use userId'
    if (opts.phase === 'Find') return { findings: found[opts.label] }
    if (opts.phase === 'Verify') return { verdicts: verdicts[opts.label] }
    if (opts.phase === 'Review') return { flagged: ['src/y.js: the total is now rounded down, which no fix asked for'] }
    return { applied: [opts.label], notApplied: [], unusedDependencies: prompt.includes('src/x.js') ? ['leftpad'] : [] }
  })
  const finds = calls.filter(c => c.phase === 'Find')
  assert.ok(finds.every(c => c.prompt.includes('use userId')), 'Find agents get the canonical choices')
  assert.ok(finds[0].prompt.includes('You also own') && finds[1].prompt.includes('Skip repo-wide work'))
  assert.ok(calls.every(c => c.prompt.startsWith('RULES') && c.prompt.includes('STEP')), 'every agent gets the rules and the step')

  // Mechanical fixes skip Verify when the checks can be trusted.
  const verifies = calls.filter(c => c.phase === 'Verify')
  assert.equal(verifies.length, 2)
  assert.ok(!verifies[0].prompt.includes('"risk": "mechanical"'))

  const fixes = calls.filter(c => c.phase === 'Fix')
  assert.deepEqual(fixes.map(c => c.label), ['fix: dependencies (add)', 'fix: group 1', 'fix: group 2', 'fix: dependencies (remove)'])
  // x.js and y.js (spelled two ways) share a group; the refuted w.js fix is gone.
  assert.ok(['src/x.js', 'src/y.js', 'test/x.test.js', 'First write a test in test/x.test.js'].every(s => fixes[1].prompt.includes(s)))
  assert.ok(!fixes.some(c => c.prompt.includes('src/w.js')))
  assert.equal(fixes[1].effort, undefined)
  assert.equal(fixes[2].effort, 'low')
  assert.ok(fixes[3].prompt.includes('leftpad'), 'dependencies the fixes orphaned reach the removal agent')

  // The applied changes of group 1 get a second reader; group 2 is all mechanical, so the checks vouch for it.
  const reviews = calls.filter(c => c.phase === 'Review')
  assert.deepEqual(reviews.map(c => c.label), ['review: group 1'])
  assert.ok(['src/x.js', 'src/y.js', 'test/x.test.js', 'git diff HEAD'].every(s => reviews[0].prompt.includes(s)))
  assert.deepEqual(result.flagged, ['src/y.js: the total is now rounded down, which no fix asked for'])

  assert.equal(result.applied.length, 4)
  // Every option carries its advantage and its disadvantage, so the user can weigh them.
  assert.deepEqual(result.decisions, ['Q?\n  Today: T\n  Problem: p src/z.js\n  Evidence: E\n  Option 1: A. Advantage: safer. Disadvantage: slower.\n  Option 2: B. Advantage: no work. Disadvantage: the problem stays.\n  Suggested: A\n  Code: src/z.js / s'])
  assert.deepEqual(result.stats, { verified: 6, refuted: 1, fixAgents: 4 })
  assert.equal(result.canon, 'use userId')
}

// Without trustChecks every finding is verified; a dead verifier or fixer is reported, not dropped silently.
{
  const { result, calls } = await run({ ...base }, (_prompt, opts) => (opts.phase === 'Find' ? { findings: [finding(['a.js'], { risk: 'mechanical' })] } : null))
  assert.deepEqual(calls.map(c => c.phase), ['Find', 'Verify'])
  assert.deepEqual(result.notApplied, ['not verified: p a.js'])
}
for (const die of [() => null, () => Promise.reject(new Error('agent stalled on all 6 attempts'))]) {
  const { result } = await run({ ...base, trustChecks: true }, (_prompt, opts) => (opts.phase === 'Find' ? { findings: [finding(['a.js'], { risk: 'mechanical' })] } : die()))
  assert.match(result.notApplied[0], /fix: group 1: the agent didn't finish/)
}

// A dead fixer names the files it may have left half edited, and those files still get a reviewer. A dead reviewer is reported too.
{
  const { result, calls } = await run({ ...base }, (_prompt, opts) =>
    opts.phase === 'Find' ? { findings: [finding(['a.js', 'b.js'])] } : opts.phase === 'Verify' ? { verdicts: [{ index: 0, real: true, reason: '' }] } : null,
  )
  assert.deepEqual(calls.map(c => c.phase), ['Find', 'Verify', 'Fix', 'Review'])
  assert.deepEqual(result.notApplied, ["fix: group 1: the agent didn't finish; these files may be half edited: a.js, b.js"])
  assert.deepEqual(result.flagged, ["Review didn't finish for: a.js, b.js"])
}

// A group whose fixes changed nothing has nothing to review.
{
  const { result, calls } = await run({ ...base }, (_prompt, opts) =>
    opts.phase === 'Find' ? { findings: [finding(['a.js'])] } : opts.phase === 'Verify' ? { verdicts: [{ index: 0, real: true, reason: '' }] } : { applied: [], notApplied: ['p a.js: the test failed twice'] },
  )
  assert.deepEqual(calls.map(c => c.phase), ['Find', 'Verify', 'Fix'])
  assert.deepEqual(result.flagged, [])
}

// Without the inventory's canonical choices every slice would pick its own, so the step ends before Find, whether the agent was stopped or stalled.
for (const die of [() => null, () => Promise.reject(new Error('agent stalled on all 6 attempts'))]) {
  const { result, calls } = await run({ ...base, inventory: true, slices: ['a', 'b'] }, (_prompt, opts) => (opts.phase === 'Inventory' ? die() : { findings: [finding(['a.js'])] }))
  assert.deepEqual(calls.map(c => c.phase), ['Inventory'])
  assert.match(result.notApplied[0], /Inventory didn't finish/)
  assert.deepEqual([result.applied, result.decisions, result.flagged], [[], [], []])
}

// A decision that came back without its write-up is passed on with what it has, not dropped.
{
  const { result } = await run({ ...base }, (_prompt, opts) => (opts.phase === 'Find' ? { findings: [finding(['a.js'], { kind: 'decision' })] } : { verdicts: [{ index: 0, real: true, reason: '' }] }))
  assert.deepEqual(result.decisions, ['p a.js\n  Code: a.js / s'])
}

// A slice given as an object: the label is its name, the prompt gets all of it.
{
  const { calls } = await run({ ...base, slices: [{ name: 'api', paths: ['src/api'] }] }, () => ({ findings: [] }))
  assert.equal(calls[0].label, 'find: api')
  assert.ok(calls[0].prompt.includes('"paths":["src/api"]'))
}

// args arrive as a JSON string by mistake, or without the texts.
{
  const { calls } = await run(JSON.stringify({ ...base }), () => ({ findings: [] }))
  assert.equal(calls.length, 1)
  await assert.rejects(run({}, () => null), /needs args.rules and args.step/)
}

// After compaction Claude Code keeps only the first 5,000 tokens of SKILL.md (about 4 bytes each).
const skill = readFileSync(join(root, 'skills/cleanup/SKILL.md'), 'utf8')
assert.ok(skill.length < 18000, 'SKILL.md is too long to survive compaction whole')

// The manifests parse, and the skill asks for the workflow by the name the plugin gives it.
const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'))
const plugin = read('.claude-plugin/plugin.json')
assert.equal(read('.claude-plugin/marketplace.json').plugins[0].name, plugin.name)
assert.ok(skill.includes(`\`${plugin.name}:${source.match(/name: '([^']+)'/)[1]}\``), 'SKILL.md names the workflow')
assert.ok(read('hooks/hooks.json').hooks.PreToolUse.every(group => group.hooks.every(hook => hook.if.startsWith(`${group.matcher}(git `))))

// The guard blocks (exit 2) only while a run's state file exists, and only the three commands.
{
  const project = mkdtempSync(join(tmpdir(), 'cleanup-guard-'))
  const guard = (command, description = '', dir = project) =>
    spawnSync('sh', [join(root, 'hooks/guard.sh')], {
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command, description }, cwd: dir }),
    })
  if (guard('git push').error) console.log('skipped hooks/guard.sh: no sh on PATH')
  else {
    assert.equal(guard('git push origin main').status, 0, 'no run in progress')
    mkdirSync(join(project, '.cleanup'))
    writeFileSync(join(project, '.cleanup/state'), '{}')
    // The forms with an option before the verb reach the guard through the "git -*" filter.
    for (const command of ['git push origin main', 'cd x && git push', 'git --no-pager push', 'git -C . push origin main', 'git -c user.name=x push', 'git --git-dir /x/.git clean -fd', 'git clean -fd', 'git reset --hard HEAD~1', 'git reset -q --hard', 'echo "a \\"quoted\\" word" && git push'])
      assert.equal(guard(command).status, 2, command)
    assert.match(String(guard('git push').stderr), /run is in progress/)
    // Claude Code sends unparseable commands like the first one to the hook too; they must pass.
    for (const command of ['npm test > .cleanup/checks.log 2>&1; echo exit $?', 'git status --porcelain', 'git -C . status', 'git reset HEAD a.js', 'git commit -F .cleanup/message', 'npm run cleanup'])
      assert.equal(guard(command).status, 0, command)
    // Only the command counts, not the words around it in the hook input.
    assert.equal(guard('npm test; echo exit $?', 'Run the tests before any git push').status, 0, 'a description is not a command')
    // A commit keeps every decision whole: each option's line carries its advantage and its disadvantage.
    const text = options => `cleanup(x): y\n\nChanges:\n- none\nNeeds decision:\n- Q?\n  Today: T\n${options}  Suggested: A\n  Code: a.js / s\nRenamed:\n- a to b\n`
    const save = options => writeFileSync(join(project, '.cleanup/message'), text(options))
    const whole = '  Option 1: A. Advantage: good. Disadvantage: bad.\n  Option 2: Leave as is. Advantage: no work. Disadvantage: the problem stays.\n'
    // What a real run did: it kept them for the first option and dropped them for "Leave as is".
    const cut = '  Option 1: A. Advantage: good. Disadvantage: bad.\n  Option 2: Leave as is.\n'
    const commit = 'git commit -q -F .cleanup/message'
    const heredoc = body => `cat > .cleanup/message <<'EOF'\n${body}EOF\n${commit}`
    const lost = (command, why) => {
      const blocked = guard(command)
      assert.equal(blocked.status, 2, why)
      assert.match(String(blocked.stderr), /exactly as the workflow returned it/)
    }
    save(whole)
    assert.equal(guard(commit).status, 0, 'whole decisions in the file')
    lost(heredoc(text(cut)), 'a heredoc in the same command, which writes the file only after the hook has run')
    save(cut)
    lost(commit, 'an option without its advantage and disadvantage, in the file')
    // The file a blocked commit left behind must not block the next message.
    assert.equal(guard(heredoc(text(whole))).status, 0, 'whole decisions in a heredoc over a stale file')
    assert.equal(guard(heredoc('cleanup(decisions): none chosen\n\nLeft as is:\n- Q?\n')).status, 0, 'no open decision, over a stale file')
    writeFileSync(join(project, '.cleanup/message'), 'cleanup(x): nothing found\n\nLeft as is:\n- Q?\n')
    assert.equal(guard(commit).status, 0, 'a message with no open decision')
    // The state folder is at the repository root, also when Claude Code was started in a subfolder.
    if (spawnSync('git', ['init', '-q', project]).status === 0) {
      mkdirSync(join(project, 'packages/api'), { recursive: true })
      assert.equal(guard('git push', '', join(project, 'packages/api')).status, 2, 'started below the repository root')
    }
  }
}

console.log('all checks passed')
