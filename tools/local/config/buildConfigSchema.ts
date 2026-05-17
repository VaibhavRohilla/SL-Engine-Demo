import { z } from 'zod';

export const BuildConfigSchema = z.object({
  game: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+/),
    description: z.string().optional(),
  }),
  display: z.object({
    width: z.number().int().positive().default(1280),
    height: z.number().int().positive().default(720),
    backgroundColor: z.string().default('0x000000'),
  }).default({}),
  assets: z.object({
    baseUrl: z.string().default('assets/'),
    manifestPath: z.string().default('assets/manifest.json'),
    bundles: z.array(z.object({
      name: z.string().min(1),
      pathPrefixes: z.array(z.string()).default([]),
      priority: z.number().int().min(0).default(10),
      required: z.boolean().default(false),
    })).optional(),
  }).default({}),
  boot: z.object({
    manifestUrl: z.string().default('assets/manifest.json'),
    startSceneBundles: z.array(z.string()).default(['main']),
    skipStartScreen: z.boolean().default(false),
  }).default({}),
  spinFeel: z.object({
    preset: z.enum(['classic', 'premium', 'snappy', 'heavy', 'arcade']).default('premium'),
  }).default({}),
}).strict();

export type BuildConfig = z.infer<typeof BuildConfigSchema>;

export const BUILD_CONFIG_SCHEMA_JSON = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'SL-Engine Starter Build Config',
  description: 'Canonical project configuration for SL-Engine starter runtime and asset tooling',
  type: 'object',
  additionalProperties: false,
  required: ['game'],
  properties: {
    $schema: { type: 'string' },
    game: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'version'],
      properties: {
        id: { type: 'string', minLength: 1, description: 'Unique game identifier (kebab-case)' },
        name: { type: 'string', minLength: 1, description: 'Human-readable game name' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+', description: 'Semantic version' },
        description: { type: 'string', description: 'Game description' },
      },
    },
    display: {
      type: 'object',
      additionalProperties: false,
      properties: {
        width: { type: 'integer', minimum: 1, default: 1280 },
        height: { type: 'integer', minimum: 1, default: 720 },
        backgroundColor: { type: 'string', default: '0x000000' },
      },
    },
    assets: {
      type: 'object',
      additionalProperties: false,
      properties: {
        baseUrl: { type: 'string', default: 'assets/' },
        manifestPath: { type: 'string', default: 'assets/manifest.json' },
        bundles: {
          type: 'array',
          description: 'Optional explicit bundle list for multi-market/skin.',
          items: {
            type: 'object',
            required: ['name'],
            additionalProperties: false,
            properties: {
              name: { type: 'string', minLength: 1 },
              pathPrefixes: { type: 'array', items: { type: 'string' }, default: [] },
              priority: { type: 'integer', minimum: 0, default: 10 },
              required: { type: 'boolean', default: false },
            },
          },
        },
      },
    },
    boot: {
      type: 'object',
      additionalProperties: false,
      properties: {
        manifestUrl: { type: 'string', default: 'assets/manifest.json' },
        startSceneBundles: { type: 'array', items: { type: 'string' }, default: ['main'] },
        skipStartScreen: { type: 'boolean', default: false },
      },
    },
    spinFeel: {
      type: 'object',
      additionalProperties: false,
      properties: {
        preset: { type: 'string', enum: ['classic', 'premium', 'snappy', 'heavy', 'arcade'], default: 'premium' },
      },
    },
  },
} as const;
