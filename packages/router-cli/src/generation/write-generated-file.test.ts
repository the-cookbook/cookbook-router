import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem } from '../test-helpers';
import { writeGeneratedFile } from './write-generated-file';

describe('writeGeneratedFile', () => {
  it('skips writes when generated content is unchanged', async () => {
    const fs = createMemoryFileSystem({ 'generated/contracts.ts': 'same' });
    let writes = 0;
    const originalWriteFile = fs.writeFile;
    fs.writeFile = async (path, contents) => {
      writes += 1;
      await originalWriteFile(path, contents);
    };

    await expect(writeGeneratedFile(fs, 'generated/contracts.ts', 'same')).resolves.toBe(false);

    expect(writes).toBe(0);
  });

  it('writes when generated content changes or the file does not exist', async () => {
    const fs = createMemoryFileSystem({ 'generated/contracts.ts': 'old' });

    await expect(writeGeneratedFile(fs, 'generated/contracts.ts', 'new')).resolves.toBe(true);
    await expect(writeGeneratedFile(fs, 'generated/register.d.ts', 'created')).resolves.toBe(true);

    expect(fs.files.get('generated/contracts.ts')).toBe('new');
    expect(fs.files.get('generated/register.d.ts')).toBe('created');
  });
});
