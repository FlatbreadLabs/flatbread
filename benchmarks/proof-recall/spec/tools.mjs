// The build farm's shader compile cache. A small Effort that completes.
// "Shader cache" here always means the farm's compile cache; the Skiff
// on-device pipeline cache belongs to the ports Effort.
const LIAM = "Liam O'Connell";
const DARA = 'Dara Whitlock';
const YUSUF = 'Yusuf Demir';
const TOMASZ = 'Tomasz Brandt';
const INES = 'Ines Okafor';
const PRIYA = 'Priya Natarajan';

export default {
  key: 'tools',
  effort: {
    title: 'Shader compile cache and build farm',
    body:
      "Liam O'Connell owns this Effort. It covers the build farm's shader compile cache, the cache key, " +
      'remote execution of shader compiles, and the flaky nightly builds that came with them. ' +
      'In this Effort "shader cache" means the farm-side compile cache that stores compiled Lantern bytecode. ' +
      'It is not the on-device pipeline cache on Skiff, which the ports Effort owns. ' +
      'The Effort ends when every farm build reads from the cache.',
    created_at: '2025-09-08T09:00:00Z',
  },
  events: [
    {
      at: '2025-09-09T10:00:00Z',
      key: 'iss-slow',
      type: 'WriteIssue',
      kind: 'gap',
      title: 'Full shader rebuilds take 47 minutes on the build farm',
      body:
        'A clean rebuild of every Lantern shader permutation takes 47 minutes on the 12-agent farm. ' +
        'There are about 38,000 permutations today and Ines Okafor expects 50,000 by alpha. ' +
        'Yusuf Demir reports that a one-line change to the saltglass refraction shader blocks art iteration for most of an hour, ' +
        'because the farm recompiles every permutation that includes the shared lighting header.',
      created_by: LIAM,
    },
    {
      at: '2025-09-12T14:00:00Z',
      key: 'fnd-baseline',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Most shader compile time on the farm repeats identical work',
      body:
        "Liam O'Connell hashed the compiled output of every permutation over five days of nightly and on-demand builds (61 builds). " +
        '61% of permutation compiles produced bytecode identical to the previous build of the same permutation. ' +
        'Another 22% changed only because an unrelated define moved in a shared header. ' +
        'A cache keyed on the right inputs could have skipped roughly 29 of the 47 minutes on an average build.',
      created_by: LIAM,
      derives_from: ['iss-slow'],
    },
    {
      at: '2025-09-12T16:00:00Z',
      key: 'con-farm',
      type: 'WriteConstraint',
      kind: 'hard',
      title: 'The build farm stays at 12 agents until alpha',
      body:
        'Dara Whitlock confirmed there is no hardware budget for more farm agents before alpha on 2026-03-02. ' +
        'Any fix for shader build time has to fit the 12 agents and the 4 TB shared volume we already own.',
      created_by: DARA,
    },
    {
      at: '2025-09-15T09:30:00Z',
      key: 'iss-approach',
      type: 'WriteIssue',
      kind: 'question',
      title: 'How should the farm stop recompiling unchanged shaders?',
      body:
        "The baseline says most of the farm's shader work repeats. We need one approach to stop doing it. " +
        'Options on the table: a shared content-addressed cache, more agents, or per-agent incremental builds.',
      created_by: LIAM,
      derives_from: ['fnd-baseline', 'con-farm'],
    },
    {
      at: '2025-09-16T10:00:00Z',
      key: 'dec-cache',
      type: 'WriteDecision',
      title:
        'Build a content-addressed shader compile cache shared by all farm agents',
      body:
        'Store each compiled permutation on the shared volume under a hash of its inputs. ' +
        'Any agent that needs a permutation fetches it if the hash exists, and compiles and uploads it if not. ' +
        'This attacks the 61% of repeat work directly and needs no new hardware. ' +
        'The hard part is the key: a key that misses an input ships stale bytecode, and a key that over-includes gets no hits.',
      created_by: LIAM,
      derives_from: ['iss-approach', 'fnd-baseline'],
    },
    {
      at: '2025-09-16T10:30:00Z',
      key: 'dec-agents',
      type: 'WriteDecision',
      title: 'Buy eight more build agents for shader compiles',
      body:
        'Twenty agents instead of 12 would cut a clean rebuild from 47 minutes to about 29. ' +
        'It is the simplest fix, but it scales cost with permutation count and breaks the 12-agent limit before alpha.',
      created_by: DARA,
      derives_from: ['iss-approach'],
    },
    {
      at: '2025-09-16T11:00:00Z',
      key: 'dec-incremental',
      type: 'WriteDecision',
      title: 'Keep a local incremental shader build on each agent',
      body:
        'Each agent keeps its own build directory and recompiles only what changed since its last job. ' +
        'Cheap to try, but jobs land on different agents each time, so Tomasz Brandt measured only a 19% local hit rate on a two-day trial.',
      created_by: TOMASZ,
      derives_from: ['iss-approach'],
    },
    {
      at: '2025-09-19T15:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-cache',
    },
    {
      at: '2025-09-19T15:30:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-approach',
      resolution: 'resolved',
      resolvedBy: ['dec-cache'],
    },
    {
      at: '2025-09-22T09:00:00Z',
      key: 'iss-key',
      type: 'WriteIssue',
      kind: 'question',
      title: 'What should the shader compile cache key hash?',
      body:
        'The cache key decides both correctness and hit rate. ' +
        'Two candidates: hash the shader source text with the compiler version, or use file modification times as a cheap proxy.',
      created_by: LIAM,
      derives_from: ['dec-cache'],
    },
    {
      at: '2025-09-22T11:00:00Z',
      key: 'dec-key-v1',
      type: 'WriteDecision',
      title: 'Key the shader cache on raw source text and compiler version',
      body:
        'Key = SHA-256 of the shader file text plus the compiler version string. ' +
        'Simple and fast: hashing all 38,000 permutations takes 9 seconds. ' +
        "Liam O'Connell flagged a doubt: included headers are not part of the hash yet.",
      created_by: LIAM,
      derives_from: ['iss-key'],
    },
    {
      at: '2025-09-22T11:30:00Z',
      key: 'dec-key-mtime',
      type: 'WriteDecision',
      title: 'Key the shader cache on file modification times',
      body:
        'Use the newest modification time of the shader and its includes. ' +
        'Nearly free to compute, but Git checkouts reset modification times, so every fresh agent would see a cold cache.',
      created_by: TOMASZ,
      derives_from: ['iss-key'],
    },
    {
      at: '2025-09-26T10:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-key-v1',
    },
    {
      at: '2025-10-14T08:30:00Z',
      key: 'fnd-stale-include',
      type: 'WriteFinding',
      kind: 'defect',
      title: 'Raw-source cache keys served stale shaders after header edits',
      body:
        'Three nightly builds between 2025-10-09 and 2025-10-13 shipped refraction shaders compiled against an old lighting header. ' +
        'The raw-source key did not change when only an included header changed, so agents fetched stale bytecode. ' +
        "Yusuf Demir caught it when saltglass caustics rendered with last week's falloff curve.",
      created_by: YUSUF,
      derives_from: ['dec-key-v1'],
    },
    {
      at: '2025-10-16T10:00:00Z',
      key: 'dec-key-v2',
      type: 'WriteDecision',
      title:
        'Key the shader cache on preprocessed source, defines, compiler version and target',
      body:
        'Run the preprocessor first and hash its output, so every included header is part of the key. ' +
        'Add the full define set and the target platform (PC, Meridian or Skiff) to the hash. ' +
        'Preprocessing costs 70 seconds per clean build, which is a fair price for never shipping stale includes again.',
      created_by: LIAM,
      derives_from: ['iss-key', 'fnd-stale-include'],
      supersedes: ['dec-key-v1'],
    },
    {
      at: '2025-10-16T11:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-key-v2',
    },
    {
      at: '2025-11-03T13:00:00Z',
      key: 'fnd-remote-bench',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Remote execution spreads cache misses across all 12 agents',
      body:
        'With the cache warm, a typical build still misses about 2,400 permutations. ' +
        'Compiled on the agent that started the job, those misses take 11 minutes. ' +
        'Fanned out to all 12 agents through remote execution, they take 1 minute 50 seconds, plus 25 seconds of scheduling overhead.',
      created_by: LIAM,
      derives_from: ['dec-cache'],
    },
    {
      at: '2025-11-04T10:00:00Z',
      key: 'dec-remote',
      type: 'WriteDecision',
      title:
        'Fan shader cache misses out to every farm agent through remote execution',
      body:
        'Every shader compile that misses the cache becomes a remote job any idle agent can take. ' +
        'Results upload to the cache, so the next build hits. ' +
        'This keeps us inside the 12-agent limit while making a cold build tolerable.',
      created_by: LIAM,
      derives_from: ['fnd-remote-bench', 'con-farm'],
    },
    {
      at: '2025-11-05T09:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-remote',
    },
    {
      at: '2025-11-10T10:00:00Z',
      key: 'con-repro',
      type: 'WriteConstraint',
      kind: 'soft',
      title: 'A cache hit must give the same bytes as a fresh compile',
      body:
        'Ines Okafor will not debug rendering bugs that only appear on cached builds. ' +
        'Bytecode served from the cache must match a fresh compile byte for byte, or the cache is not trusted.',
      created_by: INES,
    },
    {
      at: '2025-11-10T11:00:00Z',
      key: 'rsk-poison',
      type: 'WriteRisk',
      likelihood: 'low',
      severity: 'high',
      title: 'A bad cache entry could ship broken bytecode to every build',
      body:
        'If an agent with a broken compiler install uploads bad output, every later build fetches it. ' +
        'One poisoned entry for the water shader would reach every platform build until someone noticed.',
      created_by: LIAM,
      derives_from: ['dec-remote', 'con-repro'],
    },
    {
      at: '2025-11-11T10:00:00Z',
      key: 'dec-verify',
      type: 'WriteDecision',
      title: 'Recompile a 1-in-50 sample of cache hits and compare bytes',
      body:
        'Each build recompiles 2% of its cache hits on an idle agent and compares bytes with the cached copy. ' +
        'A mismatch evicts the entry and fails the build loudly. ' +
        'This adds about 40 seconds to a build and should catch a poisoned entry within two or three builds.',
      created_by: LIAM,
      derives_from: ['rsk-poison', 'con-repro'],
    },
    {
      at: '2025-11-12T09:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-verify',
    },
    {
      at: '2025-11-12T09:05:00Z',
      type: 'MitigateRisk',
      riskId: 'rsk-poison',
      decisionId: 'dec-verify',
    },
    {
      at: '2025-11-18T14:00:00Z',
      key: 'rsk-storage',
      type: 'WriteRisk',
      likelihood: 'medium',
      severity: 'medium',
      title: 'Shader cache storage could outgrow the 4 TB farm volume',
      body:
        'Every key change, compiler update and define tweak adds new entries; nothing evicts old ones yet. ' +
        'At the current rate the cache grows about 210 GB a month. ' +
        "Liam O'Connell is not sure an eviction policy is worth building before release.",
      created_by: LIAM,
      derives_from: ['dec-cache', 'con-farm'],
    },
    {
      at: '2025-12-01T09:00:00Z',
      key: 'iss-flaky',
      type: 'WriteIssue',
      kind: 'defect',
      title:
        'Nightly builds fail about 1 in 9 runs with shader compile timeouts',
      body:
        'Since remote execution went live, 7 of the last 63 nightly builds failed with "shader job timed out". ' +
        'A rerun always passes. The failures cluster after 02:00 UTC, when every platform builds at once.',
      created_by: LIAM,
      derives_from: ['dec-remote'],
    },
    {
      at: '2025-12-05T11:00:00Z',
      key: 'fnd-flaky-net',
      type: 'WriteFinding',
      kind: 'diagnosis',
      title: 'Flaky nightly builds trace to cache server fetch timeouts',
      body:
        'The failed jobs all logged a cache fetch that took longer than the 5-second fetch timeout. ' +
        "The cache server's network card peaks at 94% during the 02:00 burst. " +
        'Tomasz Brandt thinks the slow fetches cascade into job timeouts.',
      created_by: TOMASZ,
      derives_from: ['iss-flaky'],
    },
    {
      at: '2025-12-08T10:00:00Z',
      key: 'dec-timeout',
      type: 'WriteDecision',
      title:
        'Raise the shader cache fetch timeout from 5 seconds to 30 seconds',
      body:
        'A longer fetch timeout should ride out the 02:00 network peak. ' +
        'A fetch that takes 30 seconds is still faster than recompiling most permutations.',
      created_by: TOMASZ,
      derives_from: ['fnd-flaky-net'],
    },
    {
      at: '2025-12-08T15:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-timeout',
    },
    {
      at: '2025-12-10T16:00:00Z',
      key: 'fnd-noise',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Shader cache warms in 40 seconds on first boot',
      body:
        'On a Skiff devkit, the pipeline cache took 40 seconds to warm on first boot of the coast level, ' +
        'with hitches of up to 120 ms while it filled. Second boot showed no hitches.',
      created_by: PRIYA,
    },
    {
      at: '2025-12-11T09:00:00Z',
      type: 'Retract',
      recordId: 'fnd-noise',
      reason:
        'Filed in the wrong Effort. This measures the on-device pipeline cache on Skiff, which the ports Effort owns, not the build farm shader compile cache.',
    },
    {
      at: '2026-01-12T10:00:00Z',
      key: 'cit-dxc',
      type: 'WriteCitation',
      role: 'context',
      title: 'Shader compiler release notes for build 1.8.2407',
      body: 'https://github.com/microsoft/DirectXShaderCompiler/releases',
      created_by: LIAM,
    },
    {
      at: '2026-01-12T11:00:00Z',
      key: 'fnd-compiler-drift',
      type: 'WriteFinding',
      kind: 'defect',
      title:
        'Two compiler builds with the same version string emit different bytecode',
      body:
        'Agents 3 and 8 both report shader compiler version 1.8.2407, but agent 8 runs a hotfix build with a different optimizer. ' +
        'The byte-compare check from the sampling Decision flagged 14 mismatched water shader permutations in one week. ' +
        'Hashing the version string is not enough: the key must hash the compiler binary itself.',
      created_by: LIAM,
      derives_from: ['dec-verify'],
      cites: ['cit-dxc'],
    },
    {
      at: '2026-01-15T10:00:00Z',
      key: 'dec-key-v3',
      type: 'WriteDecision',
      title:
        'Key the shader cache on preprocessed source, defines, target and compiler binary hash',
      body: [
        'This replaces the version-string key. The key is now the SHA-256 of these inputs, in this order:',
        '',
        '1. The preprocessed shader source, so every included header counts.',
        '2. The sorted define set for the permutation.',
        '3. The target platform: PC, Meridian or Skiff.',
        '4. The SHA-256 of the shader compiler binary and its optimizer library, not the version string.',
        '5. The compile flags after normalization (flag order no longer matters).',
        '',
        'Hashing the compiler binary costs nothing per permutation: each agent hashes its install once at startup and caches the result.',
        'Rolling the key forward invalidates the whole cache once, so the first build after the change runs cold, about 14 minutes with remote execution.',
        "Liam O'Connell considered keeping the old entries as a fallback and decided against it, since the old key is exactly what let mismatched bytecode through.",
        '',
        'One input is left out on purpose: the shader debug name. Lantern embeds debug names in the bytecode only in development builds, ' +
          'and including the name split identical permutations into 3,100 extra entries in a trial. ' +
          'Debug names are stripped before hashing and re-added after a fetch.',
      ].join('\n'),
      created_by: LIAM,
      derives_from: ['iss-key', 'fnd-compiler-drift', 'con-repro'],
      supersedes: ['dec-key-v2'],
    },
    {
      at: '2026-01-15T14:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-key-v3',
    },
    {
      at: '2026-01-15T14:30:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-key',
      resolution: 'resolved',
      resolvedBy: ['dec-key-v3'],
    },
    {
      at: '2026-01-26T10:00:00Z',
      key: 'blb-hitrate',
      type: 'WriteBlob',
      kind: 'json',
      title:
        'Shader cache hit-rate report, four weeks after the binary-hash key',
      body: JSON.stringify(
        {
          report: 'farm shader compile cache, weekly',
          key_version: 'binary-hash key',
          weeks: [
            {
              week: 1,
              builds: 118,
              hit_rate: 71.0,
              median_build_minutes: 12.5,
            },
            { week: 2, builds: 124, hit_rate: 84.6, median_build_minutes: 9.1 },
            { week: 3, builds: 131, hit_rate: 89.9, median_build_minutes: 7.8 },
            { week: 4, builds: 127, hit_rate: 92.4, median_build_minutes: 7.2 },
          ],
          p95_fetch_ms: 180,
          storage_used_tb: 1.4,
        },
        null,
        2
      ),
      created_by: LIAM,
    },
    {
      at: '2026-01-26T10:10:00Z',
      key: 'cit-hitrate',
      type: 'WriteCitation',
      role: 'evidence',
      title: 'Weekly shader cache hit-rate report',
      body: 'Weekly hit rate, build time and storage for the farm shader compile cache. Full series in the attached report.',
      blob: 'blb-hitrate',
      created_by: LIAM,
    },
    {
      at: '2026-01-26T11:00:00Z',
      key: 'fnd-hitrate',
      type: 'WriteFinding',
      kind: 'measurement',
      title: 'Shader cache hit rate climbs steadily after the key change',
      body:
        'The first week on the binary-hash key started cold and hit 71% of permutations. ' +
        'The rate climbed every week after that; the weekly figures are in the attached report. ' +
        'Median build time is now well under the 47 minutes we started from.',
      created_by: LIAM,
      derives_from: ['dec-key-v3'],
      cites: ['cit-hitrate'],
    },
    {
      at: '2026-02-10T16:00:00Z',
      key: 'cmp-feb',
      type: 'WriteCompaction',
      title: 'Shader compile cache: where things stand in February',
      body:
        'The farm shader compile cache is live on nightly builds. Remote execution spreads cache misses across all 12 agents. ' +
        'The current key hashes preprocessed source, defines, target and the compiler binary; hit rate reached the low 90s. ' +
        'Flaky nightly builds are still open. The working diagnosis is cache server fetch timeouts during the 02:00 burst, ' +
        'and the fix in place is the 30-second fetch timeout. Storage growth is an open Risk. ' +
        'Next: turn the cache on for every build, then close the Effort before alpha.',
      created_by: LIAM,
      derives_from: [
        'dec-cache',
        'dec-key-v3',
        'dec-remote',
        'dec-timeout',
        'fnd-flaky-net',
        'fnd-hitrate',
        'iss-flaky',
        'iss-slow',
        'rsk-storage',
      ],
    },
    {
      at: '2026-02-24T09:00:00Z',
      key: 'fnd-flaky-oom',
      type: 'WriteFinding',
      kind: 'diagnosis',
      title:
        'Flaky nightly builds are compiler processes running out of memory on agents 7 and 11',
      body:
        'The 30-second fetch timeout did not help: 4 of the next 31 nightly builds still failed. ' +
        'Every failed job since December ran on agent 7 or agent 11, the two agents with 32 GB of RAM instead of 64 GB. ' +
        'During the 02:00 burst those agents run 16 parallel compiles, the compiler hits the memory limit, and the job hangs until it times out. ' +
        'The slow cache fetches were a symptom of swapping, not the cause.',
      created_by: LIAM,
      derives_from: ['iss-flaky', 'dec-timeout'],
    },
    {
      at: '2026-02-24T09:10:00Z',
      type: 'Invalidate',
      findingId: 'fnd-flaky-oom',
      targetId: 'fnd-flaky-net',
    },
    {
      at: '2026-02-26T10:00:00Z',
      key: 'dec-cap-jobs',
      type: 'WriteDecision',
      title: 'Cap each farm agent at 6 parallel shader compile jobs',
      body:
        'The remote execution scheduler now caps every agent at 6 parallel shader compiles, whatever its core count. ' +
        'On agents 7 and 11 this keeps peak compiler memory under 26 GB. ' +
        'Cold builds get about 50 seconds slower; flaky failures should stop.',
      created_by: LIAM,
      derives_from: ['fnd-flaky-oom'],
    },
    {
      at: '2026-02-26T11:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-cap-jobs',
    },
    {
      at: '2026-03-09T09:00:00Z',
      key: 'iss-devws',
      type: 'WriteIssue',
      kind: 'gap',
      title: 'Developer workstations cannot read the farm shader cache',
      body:
        'Only farm agents can reach the cache volume. A developer workstation still compiles every shader locally, ' +
        'about 22 minutes after a fresh sync. Opening read access needs a VPN change and a cache proxy.',
      created_by: YUSUF,
      derives_from: ['dec-cache'],
    },
    {
      at: '2026-03-16T09:00:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-flaky',
      resolution: 'resolved',
      resolvedBy: ['dec-cap-jobs'],
    },
    {
      at: '2026-03-20T10:00:00Z',
      key: 'dec-ship',
      type: 'WriteDecision',
      title: 'Turn the shader compile cache on for every farm build',
      body:
        'Nightly, on-demand and release builds all read from and write to the cache from today. ' +
        'Release builds keep the 1-in-50 byte-compare sample. Fresh compiles remain available with a build flag.',
      created_by: LIAM,
      derives_from: ['dec-cache', 'dec-key-v3', 'dec-cap-jobs'],
    },
    {
      at: '2026-03-20T11:00:00Z',
      type: 'AcceptDecision',
      decisionId: 'dec-ship',
    },
    {
      at: '2026-03-20T11:30:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-slow',
      resolution: 'resolved',
      resolvedBy: ['dec-ship'],
    },
    {
      at: '2026-04-28T15:00:00Z',
      key: 'fnd-retro',
      type: 'WriteFinding',
      kind: 'retrospective',
      title: 'Retrospective on the shader compile cache',
      body: [
        'The cache has run on every farm build for five weeks. What went well and what did not:',
        '',
        '- The content-addressed design held up. Two key changes were needed before the cache could be trusted: the first after stale headers, the second after the compiler hotfix build.',
        '- Remote execution made cold builds tolerable inside the 12-agent limit.',
        '- We lost about three weeks blaming the network for the flaky nightly builds. The real cause was memory on agents 7 and 11.',
        '- The byte-compare sample caught real problems twice and never fired falsely.',
        '',
        'Numbers at the end of the Effort:',
        '',
        '- Steady-state hit rate: 94%.',
        '- Storage used: 1.9 TB of the 4 TB volume, growing about 210 GB a month, which leaves roughly ten months of headroom.',
        '',
        "Dara Whitlock and Liam O'Connell agreed not to build cache eviction before release; storage growth is accepted as it stands.",
        'Workstation access to the cache is deferred until after release; it needs a VPN change nobody has time for.',
        '',
        'Final clean rebuild time with a warm cache: 6 min 40 s, down from 47 minutes.',
      ].join('\n'),
      created_by: LIAM,
      derives_from: ['dec-ship', 'fnd-hitrate', 'rsk-storage', 'iss-devws'],
    },
    {
      at: '2026-05-04T10:00:00Z',
      type: 'ResolveIssue',
      issueId: 'iss-devws',
      resolution: 'deferred',
      resolvedBy: ['fnd-retro'],
    },
    {
      at: '2026-05-04T10:05:00Z',
      type: 'SetRiskState',
      riskId: 'rsk-storage',
      state: 'accepted',
      evidence: ['fnd-retro'],
    },
    {
      at: '2026-05-06T09:00:00Z',
      type: 'SetEffortStatus',
      status: 'completed',
    },
  ],
};
