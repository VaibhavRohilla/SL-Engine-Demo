/**
 * Create a locale service from starter-owned resources.
 * Starter implements the SDK's ILocaleService contract.
 */

import type { ILocaleService } from '@fnx/sl-engine';
import { en } from './en.ts';

export type LocaleResources = Record<string, Record<string, string>>;

export interface CreateLocaleServiceOptions {
  locale: string;
  fallback?: string;
  resources: LocaleResources;
}

/**
 * Build an ILocaleService from a map of locale code → key → string.
 * Missing keys return the key; missing locales fall back to fallback locale then key.
 */
export function createLocaleService(options: CreateLocaleServiceOptions): ILocaleService {
  const { locale, fallback = 'en', resources } = options;

  function getFallbackChain(): string[] {
    const chain: string[] = [locale];
    if (fallback && fallback !== locale && !chain.includes(fallback)) {
      chain.push(fallback);
    }
    return chain;
  }

  return {
    get(key: string): string {
      const chain = getFallbackChain();
      for (const loc of chain) {
        const map = resources[loc];
        if (map && key in map) {
          const value = (map as Record<string, string>)[key];
          if (value !== undefined) return value;
        }
      }
      return key;
    },
    getLocale(): string {
      return locale;
    },
    getFallbackChain(): readonly string[] {
      return getFallbackChain();
    },
  };
}

/** Default English locale service for the starter. */
export function createDefaultLocaleService(): ILocaleService {
  return createLocaleService({
    locale: 'en',
    fallback: 'en',
    resources: { en: en as unknown as Record<string, string> },
  });
}
