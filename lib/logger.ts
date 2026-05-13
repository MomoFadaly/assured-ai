/**
 * Structured logging via Pino.
 *
 * Use this everywhere instead of console.log. In production, logs are
 * JSON-formatted and ingested by Vercel/Sentry. In dev, they are pretty-printed.
 *
 * Sensitive data (PII, API keys, raw queries before redaction) must NEVER
 * be logged. The orchestration layer ensures redaction happens before any
 * logging call.
 */

import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : isProd ? 'info' : 'debug'),
  // Pretty-print in dev, JSON in prod.
  transport: !isProd && !isTest
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Never log these fields, even if accidentally passed.
  redact: {
    paths: [
      '*.password',
      '*.api_key',
      '*.apiKey',
      '*.token',
      '*.secret',
      '*.authorization',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});
