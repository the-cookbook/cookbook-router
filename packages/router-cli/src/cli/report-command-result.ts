import type { CommandResult } from '../contracts';

export interface ReportCommandResultOptions {
  readonly json?: boolean;
}

export function reportCommandResult(
  result: CommandResult,
  writeStdout: (message: string) => void,
  writeStderr: (message: string) => void,
  options: ReportCommandResultOptions = {},
): number {
  if (options.json) {
    writeStdout(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }

  if (!result.ok) {
    writeStderr(result.errors.join('\n'));
    return 1;
  }

  if (result.files[0]) {
    const changedFiles = result.changedFiles;

    if (changedFiles !== undefined && !changedFiles[0]) {
      writeStdout('Router artifacts are up to date.');
      return 0;
    }

    writeStdout(`Generated ${result.files.length.toString()} files.`);
    for (const file of result.files) {
      writeStdout(`  ${file}`);
    }
    return 0;
  }

  writeStdout('Routes are valid.');
  return 0;
}
