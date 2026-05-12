export type ProofCliEntrypoint = 'run_dag' | 'setup';

/**
 * Keep the historical `proof --dag ...` contract intact by only peeling off
 * an explicit `setup` subcommand in argv slot 0 (`process.argv[2]` in the bin).
 */
export function selectProofCliEntrypoint(
  argv: readonly string[]
): ProofCliEntrypoint {
  return argv[0] === 'setup' ? 'setup' : 'run_dag';
}
