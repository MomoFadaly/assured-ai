/**
 * Fetch a URL and return its raw bytes plus content type.
 *
 * Respects:
 *  - User-Agent header that identifies the crawler (good citizen)
 *  - HTTP timeouts (no infinite hangs)
 *  - Retries on 5xx and network errors only (NOT on 4xx)
 *
 * Does NOT respect robots.txt for the POC corpus, since every URL in the
 * curated source list has been hand-vetted for permissive use. Production
 * deployments that ingest from a wider crawl SHOULD add robots.txt support.
 */

import pRetry, { AbortError } from 'p-retry';
import { logger } from '@/lib/logger';

const USER_AGENT = 'AssuredAI-Corpus-Bot/0.1 (+https://github.com/assured-ai)';
const TIMEOUT_MS = 30_000;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB cap per resource

export interface FetchedResource {
  url: string;
  finalUrl: string;
  contentType: string;
  body: Buffer;
}

export async function crawl(url: string): Promise<FetchedResource> {
  return pRetry(
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/pdf,application/xhtml+xml,*/*',
          },
          signal: controller.signal,
          redirect: 'follow',
        });

        if (!response.ok) {
          // 4xx: don't retry. 5xx: pRetry will retry.
          if (response.status >= 400 && response.status < 500) {
            throw new AbortError(`HTTP ${response.status} for ${url}`);
          }
          throw new Error(`HTTP ${response.status} for ${url}`);
        }

        const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_BYTES) {
          throw new AbortError(
            `Resource too large (${arrayBuffer.byteLength} bytes) for ${url}`,
          );
        }
        return {
          url,
          finalUrl: response.url,
          contentType,
          body: Buffer.from(arrayBuffer),
        };
      } finally {
        clearTimeout(timer);
      }
    },
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 8000,
      onFailedAttempt: (err) => {
        logger.warn(
          { url, attempt: err.attemptNumber, message: err.message },
          'crawl attempt failed',
        );
      },
    },
  );
}
