import type { IsoTimestamp } from '../domain/shared/index.js';

export interface RuntimeClock {
  now(): IsoTimestamp;
}

export const systemClock: RuntimeClock = {
  now: () => new Date().toISOString(),
};

export function createStableId(prefix: string, ...parts: Array<string | number | undefined>): string {
  const suffix = parts
    .filter((part): part is string | number => part !== undefined && part !== '')
    .map((part) => String(part).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .map((part) => part.replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join(':');

  return suffix ? `${prefix}:${suffix}` : prefix;
}

export function toIsoTimestamp(value: string | number | Date | undefined, fallback: RuntimeClock = systemClock): IsoTimestamp {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return fallback.now();
}
