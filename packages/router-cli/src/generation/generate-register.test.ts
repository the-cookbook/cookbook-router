import { describe, expect, test } from 'vitest';
import { generateRegister } from './generate-register';

describe('generateRegister', () => {
  test('generates global router contract module augmentation', () => {
    const output = generateRegister();

    expect(output).toContain("import type { RouterContracts } from './contracts';");
    expect(output).toContain("declare module '@cookbook/router'");
    expect(output).toContain('contracts: RouterContracts;');
    expect(output).toContain('export {};');
  });
});
