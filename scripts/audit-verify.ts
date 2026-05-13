/**
 * CLI: verify the audit log hash chain.
 *
 * Usage: pnpm audit:verify
 *
 * Exit code 0 if valid; non-zero if tampering detected.
 */

import 'dotenv/config';
import { closePool } from '@/lib/db/client';
import { verifyChain } from '@/lib/audit/verify-chain';

async function main(): Promise<void> {
  const result = await verifyChain();

  console.log('');
  if (result.valid) {
    console.log('  ✓ Chain valid');
    console.log(`    rows checked:  ${result.rowsChecked}`);
    console.log(`    duration:      ${result.durationMs}ms`);
    console.log('    Genesis to head, every hash recomputed and matched.');
    console.log('');
    await closePool();
    process.exit(0);
  } else {
    console.error('  ✗ Chain TAMPERED');
    console.error(`    rows checked:        ${result.rowsChecked}`);
    console.error(`    first failure id:    ${result.firstFailureId}`);
    console.error(`    first failure reason: ${result.firstFailureReason}`);
    console.error('');
    await closePool();
    process.exit(2);
  }
}

main().catch(async (err) => {
  console.error('audit:verify failed:', err);
  await closePool();
  process.exit(1);
});
