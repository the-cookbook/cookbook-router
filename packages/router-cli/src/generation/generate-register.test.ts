import { describe, expect, it } from 'vitest';
import { generateRegister } from './generate-register';

describe('generateRegister', () => {
  it('generates global router contract module augmentation', () => {
    const output = generateRegister();

    expect(output).toContain("import type { RouterContracts } from './contracts';");
    expect(output).toContain("declare module '@cookbook/router'");
    expect(output).toContain("declare module '@cookbook/router-react'");
    expect(output).toContain('contracts: RouterContracts;');
    expect(output).toContain('export {};');
  });
});
