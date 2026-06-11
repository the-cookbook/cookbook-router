import type { CommandResult } from '../contracts';

export function reportCommandResult(
  result: CommandResult,
  writeStdout: (message: string) => void,
  writeStderr: (message: string) => void,
): number {
  if (!result.ok) {
    writeStderr(result.errors.join('\n'));
    return 1;
  }

  if (result.files[0]) {
    writeStdout(`Generated ${result.files.length.toString()} files.`);
    for (const file of result.files) {
      writeStdout(`  ${file}`);
    }
  } else {
    writeStdout('Routes are valid.');
  }

  return 0;
}
