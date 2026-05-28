import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

type TypeOrArray<T> = T | T[];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toArray<T>(
  value: TypeOrArray<T> | Readonly<TypeOrArray<T>>
): T[] {
  return Array.isArray(value) ? [...value] : [value as T];
}
