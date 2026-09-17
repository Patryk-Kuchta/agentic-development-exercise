/**
 * The one environment check worth making by hand.
 *
 * `node:sqlite` only grew `Statement.setReturnArrays` in Node 24, and Drizzle's
 * migrator calls it. On anything older the very first query dies with
 * `TypeError: stmt.setReturnArrays is not a function` thirty lines deep inside
 * the migrator — an error that says nothing about the actual cause.
 *
 * Checking here turns that into one sentence naming the fix. Boundaries fail
 * loudly; this is the outermost boundary there is.
 */

const requiredMajor = 24;

export function assertSupportedNodeVersion(version = process.versions.node): void {
  const [major] = version.split('.');
  const parsed = major === undefined ? Number.NaN : Number.parseInt(major, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Could not read the Node version from "${version}".`);
  }

  if (parsed >= requiredMajor) {
    return;
  }

  throw new Error(
    [
      `This app needs Node ${String(requiredMajor)} or newer, but is running on ${version}.`,
      '',
      "Node's built-in SQLite only gained the API Drizzle's migrator uses in Node 24,",
      'so every migration fails on older versions.',
      '',
      'The version is pinned in .nvmrc. Run:',
      '',
      '  nvm use',
      '',
      'and start the app again.',
    ].join('\n'),
  );
}

/**
 * What an entry point calls. A wrong Node version is a setup mistake, not a
 * bug, so it gets the sentence and nothing else — a stack trace here would
 * bury the one line that matters.
 */
export function requireSupportedNodeVersion(): void {
  try {
    assertSupportedNodeVersion();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
