import { expectTypeOf, test } from 'vitest';
import type {
  CliFileSystem,
  CommandResult,
  Register,
  RouterContracts,
  WatchHandle,
} from './contracts';

test('exposes CLI contracts', () => {
  expectTypeOf<Register>().toMatchTypeOf<object>();
  expectTypeOf<RouterContracts>().toMatchTypeOf<object>();
  expectTypeOf<CommandResult>().toHaveProperty('ok').toEqualTypeOf<boolean>();
  expectTypeOf<CliFileSystem>().toHaveProperty('readFile');
  expectTypeOf<WatchHandle>().toHaveProperty('close');
});
