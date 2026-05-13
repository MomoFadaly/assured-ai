/**
 * GET /api/audit/[id]/pdf — download the audit entry as a polished compliance PDF.
 *
 * Streams an A4 PDF with the AssuredAI verification stamp, the redacted
 * article, the per-paragraph citations, and the cryptographic chain
 * fingerprint. CISOs file this artifact.
 */

import { renderToBuffer } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Link, Svg, Path } from '@react-pdf/renderer';
import * as React from 'react';
import { query } from '@/lib/db/client';
import type { AuditCitation } from '@/lib/db/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AuditRow {
  id: number;
  occurred_at: Date;
  scenario: string;
  query_redacted: string;
  response_redacted: string | null;
  citations: AuditCitation[] | null;
  verification_detail: unknown;
  outcome: string;
  outcome_reason: string | null;
  pii_detected_input: boolean;
  pii_detected_output: boolean;
  red_flag_category: string | null;
  latency_ms: number | null;
  model_used: string | null;
  prev_hash: string | null;
  hash: string;
}

const PRIMARY = '#1c3d80';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const BG_SOFT = '#f8fafc';

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10.5, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  brandTag: { marginLeft: 4, fontSize: 7, color: MUTED, padding: 2, paddingHorizontal: 4, borderRadius: 2, borderColor: BORDER, borderWidth: 0.5, textTransform: 'uppercase' },
  pageMeta: { fontSize: 9, color: MUTED },
  hero: { borderColor: EMERALD, borderWidth: 1, borderRadius: 10, padding: 18, marginBottom: 16, backgroundColor: '#f0fdf4' },
  heroAmber: { borderColor: AMBER, borderWidth: 1, borderRadius: 10, padding: 18, marginBottom: 16, backgroundColor: '#fffbeb' },
  heroTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  heroSubtitle: { fontSize: 10, color: MUTED, lineHeight: 1.45 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  pill: { fontSize: 8.5, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10, borderColor: BORDER, borderWidth: 0.5, color: '#0f172a' },
  sectionTitle: { fontSize: 8.5, color: MUTED, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  card: { borderColor: BORDER, borderWidth: 0.5, borderRadius: 8, padding: 16, marginBottom: 14 },
  paragraph: { marginBottom: 8 },
  paragraphText: { fontSize: 11, lineHeight: 1.55, color: '#0f172a' },
  paragraphMeta: { marginTop: 3, fontSize: 8, color: MUTED },
  paragraphMetaSupported: { marginTop: 3, fontSize: 8, color: EMERALD },
  paragraphMetaUnsourced: { marginTop: 3, fontSize: 8, color: AMBER },
  citationRow: { flexDirection: 'row', marginBottom: 4, gap: 8, alignItems: 'flex-start' },
  citationAvatar: { width: 22, height: 22, borderRadius: 4, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  citationAvatarText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: PRIMARY, letterSpacing: 0.4 },
  citationTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  citationMeta: { fontSize: 8, color: MUTED },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metaItem: { width: '50%', marginBottom: 8 },
  metaLabel: { fontSize: 7.5, color: MUTED, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase' },
  metaValue: { fontSize: 10, marginTop: 1 },
  hashBox: { backgroundColor: BG_SOFT, padding: 10, borderRadius: 6, marginTop: 6, fontFamily: 'Courier', fontSize: 8.5, lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 8 },
  footerText: { fontSize: 8, color: MUTED },
});

function Brand() {
  return (
    <View style={styles.brand}>
      <Svg viewBox="0 0 24 24" width={16} height={16}>
        <Path d="M12 2.2 4 5.1v6.4c0 4.5 3.4 8.7 8 10.3 4.6-1.6 8-5.8 8-10.3V5.1L12 2.2Z" fill={PRIMARY} />
        <Path d="m8 12 2.8 2.8L16 9.6" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.brandText}>AssuredAI</Text>
      <Text style={styles.brandTag}>VERIFIED</Text>
    </View>
  );
}

function orgInitials(org: string): string {
  if (!org) return '??';
  if (org.includes('/')) return org.split('/')[1]?.slice(0, 3) ?? org.slice(0, 3);
  const words = org.split(' ').filter(Boolean);
  if (words.length >= 2 && words[0] && words[1]) return ((words[0][0] ?? '') + (words[1][0] ?? '')).toUpperCase();
  return org.slice(0, 3).toUpperCase();
}

interface ParagraphCheck {
  paragraph_index: number;
  text: string;
  sentences?: Array<{ text: string; citations: { source_id: string; organization: string; title: string }[] }>;
  support: { kind: 'supported'; citations: { source_id: string; organization: string; title: string; similarity: number }[]; top_similarity: number } | { kind: 'unsourced'; top_similarity: number; best_match: { organization: string; title: string } | null };
}

function ReportDocument({ row }: { row: AuditRow }) {
  const detail = row.verification_detail as { paragraphs?: ParagraphCheck[]; report?: { disclaimer_injected?: boolean } } | null;
  const paragraphs = detail?.paragraphs ?? [];
  const disclaimerInjected = detail?.report?.disclaimer_injected ?? false;
  const isClean = row.outcome === 'answered' && !row.pii_detected_input && !disclaimerInjected;
  const hero = isClean ? styles.hero : styles.heroAmber;
  const title = isClean ? 'Verified by AssuredAI' : row.outcome === 'red_flag_escalation' ? 'Auto-blocked by AssuredAI' : 'Verified with notes by AssuredAI';
  const occurredAt = new Date(row.occurred_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

  return (
    <Document
      title={`AssuredAI verification report · audit #${row.id}`}
      author="AssuredAI"
      subject="Compliance verification report"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Brand />
          <Text style={styles.pageMeta}>Compliance report · Audit #{row.id}</Text>
        </View>

        <View style={hero}>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroSubtitle}>
            This content was run through AssuredAI&apos;s compliance pipeline on {occurredAt}. The hash chain at the
            bottom of this document cryptographically links the audit entry to every prior verification — back to the
            genesis record.
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.pill}>Audit #{row.id}</Text>
            <Text style={styles.pill}>Scenario: {row.scenario}</Text>
            {row.model_used && <Text style={styles.pill}>Model: {row.model_used}</Text>}
            <Text style={styles.pill}>Latency: {(row.latency_ms ?? 0).toLocaleString()}ms</Text>
          </View>
        </View>

        {row.outcome === 'red_flag_escalation' ? (
          <View style={[styles.card, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.sectionTitle, { color: '#991b1b' }]}>Auto-blocked content</Text>
            <Text style={[styles.paragraphText, { color: '#991b1b' }]}>{row.response_redacted ?? ''}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Verified article</Text>
            {paragraphs.length > 0
              ? paragraphs.map((p) => {
                  const support = p.support;
                  if (support.kind === 'supported') {
                    const orgs = support.citations.map((c) => c.organization).join(', ');
                    return (
                      <View key={p.paragraph_index} style={styles.paragraph}>
                        <Text style={styles.paragraphText}>{p.text}</Text>
                        <Text style={styles.paragraphMetaSupported}>
                          {`✓ Supported (similarity ${support.top_similarity.toFixed(2)}) — ${orgs}`}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <View key={p.paragraph_index} style={styles.paragraph}>
                      <Text style={styles.paragraphText}>{p.text}</Text>
                      <Text style={styles.paragraphMetaUnsourced}>
                        {`⚠ Unsourced — editor review recommended (top similarity ${support.top_similarity.toFixed(2)})`}
                      </Text>
                    </View>
                  );
                })
              : (
                <Text style={styles.paragraphText}>{row.response_redacted ?? ''}</Text>
              )}
            {disclaimerInjected && (
              <Text style={[styles.paragraphMeta, { fontStyle: 'italic' }]}>
                ↑ Disclaimer auto-injected by AssuredAI
              </Text>
            )}
          </View>
        )}

        {row.citations && row.citations.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sources cited · {row.citations.length}</Text>
            {row.citations.map((c) => (
              <View key={c.url} style={styles.citationRow}>
                <View style={styles.citationAvatar}>
                  <Text style={styles.citationAvatarText}>{orgInitials(c.organization)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.citationTitle}>{c.title}</Text>
                  <Text style={styles.citationMeta}>
                    {c.organization} · <Link src={c.url}>{c.url}</Link>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Compliance metadata</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Outcome</Text>
              <Text style={styles.metaValue}>{row.outcome.replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Scenario</Text>
              <Text style={styles.metaValue}>{row.scenario}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>PII detected (input)</Text>
              <Text style={styles.metaValue}>{row.pii_detected_input ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>PII detected (output)</Text>
              <Text style={styles.metaValue}>{row.pii_detected_output ? 'Yes' : 'No'}</Text>
            </View>
            {disclaimerInjected && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Disclaimer</Text>
                <Text style={styles.metaValue}>Auto-injected</Text>
              </View>
            )}
            {row.red_flag_category && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Red flag</Text>
                <Text style={styles.metaValue}>{row.red_flag_category.replace(/_/g, ' ')}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Latency</Text>
              <Text style={styles.metaValue}>{(row.latency_ms ?? 0).toLocaleString()}ms</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Verified at</Text>
              <Text style={styles.metaValue}>{occurredAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cryptographic fingerprint</Text>
          <View style={styles.hashBox}>
            <Text>previous: {row.prev_hash ?? 'genesis'}</Text>
            <Text>this:     {row.hash}</Text>
          </View>
          <Text style={[styles.paragraphMeta, { marginTop: 6 }]}>
            Re-verify this proof at any time: visit /v/{row.id} and click <Text style={{ fontFamily: 'Helvetica-Bold' }}>Verify chain</Text>.
            Each entry hashes the previous entry&apos;s hash with SHA-256, so altering any historical row breaks every entry
            that follows.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AssuredAI · governed AI for healthcare and government publishers</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId < 1) {
    return new Response('invalid id', { status: 400 });
  }
  const result = await query<AuditRow>(
    `SELECT id, occurred_at, scenario, query_redacted, response_redacted,
            citations, verification_detail, outcome, outcome_reason,
            pii_detected_input, pii_detected_output,
            red_flag_category, latency_ms, model_used, prev_hash, hash
       FROM audit_log
       WHERE id = $1`,
    [numericId],
  );
  const row = result.rows[0];
  if (!row) return new Response('not found', { status: 404 });

  const buffer = await renderToBuffer(<ReportDocument row={row} />);

  return new Response(buffer as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assured-ai-audit-${row.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
