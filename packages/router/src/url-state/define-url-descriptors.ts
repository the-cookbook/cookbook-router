import type { RouteHashSchema, RouteSearchSchema } from '../route-config/contracts';

type UnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (
  value: infer Intersection,
) => void
  ? Intersection
  : never;

type Simplify<Type> = { readonly [Key in keyof Type]: Type[Key] };

/** Merged static search descriptor type preserving literal descriptor fields. */
export type MergedSearchDescriptors<Descriptors extends readonly RouteSearchSchema[]> = Simplify<
  UnionToIntersection<Descriptors[number]>
>;

/** Defines a reusable static search descriptor while preserving literals. */
export function defineSearch<const Search extends RouteSearchSchema>(search: Search): Search {
  return search;
}

/**
 * Merges reusable static search descriptors.
 *
 * Duplicate descriptor keys are rejected at runtime to avoid hidden overrides.
 */
export function mergeSearch<const Descriptors extends readonly RouteSearchSchema[]>(
  ...descriptors: Descriptors
): MergedSearchDescriptors<Descriptors> {
  const merged: Record<string, RouteSearchSchema[string]> = {};

  for (const descriptor of descriptors) {
    for (const [key, value] of Object.entries(descriptor)) {
      if (Object.prototype.hasOwnProperty.call(merged, key)) {
        throw new Error(`Duplicate search descriptor key "${key}" passed to mergeSearch().`);
      }

      merged[key] = value;
    }
  }

  return merged as MergedSearchDescriptors<Descriptors>;
}

/** Defines a reusable static hash descriptor while preserving literals. */
export function defineHash<const Hash extends RouteHashSchema>(hash: Hash): Hash {
  return hash;
}
