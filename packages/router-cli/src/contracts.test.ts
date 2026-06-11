import { expectTypeOf, it } from 'vitest';
import type {
  CliFileSystem,
  CommandResult,
  Register,
  RouterContracts,
  WatchHandle,
} from './contracts';

it('exposes CLI contracts', () => {
  expectTypeOf<Register>().toExtend<object>();
  expectTypeOf<RouterContracts>().toExtend<object>();
  expectTypeOf<CommandResult>().toHaveProperty('ok').toEqualTypeOf<boolean>();
  expectTypeOf<CliFileSystem>().toHaveProperty('readFile');
  expectTypeOf<WatchHandle>().toHaveProperty('close');
});
