import type { CliFileSystem } from '../contracts';

/** Writes generated output only when the file content actually changed. */
export async function writeGeneratedFile(
  fs: CliFileSystem,
  path: string,
  contents: string,
): Promise<boolean> {
  const current = await readExistingFile(fs, path);

  if (current === contents) {
    return false;
  }

  await fs.writeFile(path, contents);
  return true;
}

async function readExistingFile(fs: CliFileSystem, path: string): Promise<string | undefined> {
  try {
    return await fs.readFile(path);
  } catch {
    return undefined;
  }
}
