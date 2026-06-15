import { expectTypeOf, it } from 'vitest';
import type {
  CliFileSystem,
  CommandResult,
  Register,
  RouterCliConfig,
  RouterContracts,
  WatchHandle,
} from './contracts';

it('exposes CLI contracts', () => {
  expectTypeOf<Register>().toExtend<object>();
  expectTypeOf<RouterContracts>().toExtend<object>();
  expectTypeOf<RouterCliConfig>().toHaveProperty('routeFiles');
  expectTypeOf<CommandResult>().toHaveProperty('ok').toEqualTypeOf<boolean>();
  expectTypeOf<CliFileSystem>().toHaveProperty('readFile');
  expectTypeOf<WatchHandle>().toHaveProperty('close');
});
