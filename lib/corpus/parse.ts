/**
 * Convert fetched resources into clean text.
 *
 * HTML: Mozilla Readability extracts the main article content, then html-to-text
 *       strips remaining HTML to plain text with paragraph structure preserved.
 * PDF:  pdf-parse extracts text page by page.
 *
 * The output is deterministic for a given input — we run it locally, no LLM
 * involvement. Cleanliness here directly affects retrieval quality downstream.
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { htmlToText } from 'html-to-text';
import pdfParse from 'pdf-parse';
import { logger } from '@/lib/logger';
import type { FetchedResource } from './crawl';
import type { ParsedDocument } from './types';

export async function parse(fetched: FetchedResource): Promise<ParsedDocument> {
  const ct = fetched.contentType.toLowerCase();
  if (ct.includes('pdf') || fetched.url.toLowerCase().endsWith('.pdf')) {
    return parsePdf(fetched);
  }
  if (ct.includes('html') || ct.includes('xml') || ct.includes('text/plain')) {
    return parseHtml(fetched);
  }
  logger.warn({ url: fetched.url, contentType: ct }, 'Unsupported content type, treating as HTML');
  return parseHtml(fetched);
}

async function parseHtml(fetched: FetchedResource): Promise<ParsedDocument> {
  const html = fetched.body.toString('utf-8');
  const dom = new JSDOM(html, { url: fetched.finalUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  // If Readability extraction failed (e.g., structural pages), fall back to whole-page text.
  const sourceHtml = article?.content ?? html;
  const cleanText = htmlToText(sourceHtml, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'nav', format: 'skip' },
      { selector: 'footer', format: 'skip' },
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
    ],
  });

  return {
    url: fetched.finalUrl,
    title: article?.title ?? extractTitleFromHtml(html) ?? fetched.finalUrl,
    cleanText: cleanText.replace(/\n{3,}/g, '\n\n').trim(),
    metadata: {
      content_type: 'text/html',
      readability_extracted: !!article,
      excerpt: article?.excerpt ?? null,
    },
  };
}

async function parsePdf(fetched: FetchedResource): Promise<ParsedDocument> {
  const pdf = await pdfParse(fetched.body);
  return {
    url: fetched.finalUrl,
    title: pdf.info?.Title?.toString() ?? fetched.finalUrl,
    cleanText: pdf.text.replace(/\n{3,}/g, '\n\n').trim(),
    metadata: {
      content_type: 'application/pdf',
      page_count: pdf.numpages,
      pdf_info: pdf.info,
    },
  };
}

function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}
