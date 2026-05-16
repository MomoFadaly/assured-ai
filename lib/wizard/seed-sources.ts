/**
 * Per-industry curated seed source lists.
 *
 * What gets pre-loaded into a sandbox tenant's source library at
 * provision time. These are the canonical authoritative bodies for
 * each regulated vertical — the ones a CISO would name on a security
 * review call as their baseline corpus.
 *
 * The names are short on purpose; the right-rail preview renders
 * them in a tight stagger and longer names break the visual rhythm.
 */

import type { Industry } from './types';

export const SEED_SOURCES: Record<Industry, Array<{ name: string; url: string; type: string }>> = {
  healthcare: [
    { name: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov', type: 'peer-reviewed' },
    { name: 'CDC.gov', url: 'https://www.cdc.gov', type: 'government' },
    { name: 'FDA.gov', url: 'https://www.fda.gov', type: 'government' },
    { name: 'NIH.gov', url: 'https://www.nih.gov', type: 'government' },
    { name: 'American Heart Association', url: 'https://www.heart.org', type: 'professional' },
    { name: 'American Cancer Society', url: 'https://www.cancer.org', type: 'professional' },
    { name: 'Mayo Clinic Patient Ed', url: 'https://www.mayoclinic.org', type: 'professional' },
    { name: 'AHRQ', url: 'https://www.ahrq.gov', type: 'government' },
  ],
  finance: [
    { name: 'SEC.gov', url: 'https://www.sec.gov', type: 'government' },
    { name: 'FINRA', url: 'https://www.finra.org', type: 'regulator' },
    { name: 'Federal Reserve', url: 'https://www.federalreserve.gov', type: 'government' },
    { name: 'FDIC', url: 'https://www.fdic.gov', type: 'government' },
    { name: 'CFPB', url: 'https://www.consumerfinance.gov', type: 'government' },
    { name: 'IRS Publications', url: 'https://www.irs.gov', type: 'government' },
    { name: 'CFA Institute', url: 'https://www.cfainstitute.org', type: 'professional' },
    { name: 'Investopedia (verified)', url: 'https://www.investopedia.com', type: 'reference' },
  ],
  government: [
    { name: 'USA.gov', url: 'https://www.usa.gov', type: 'government' },
    { name: 'GAO Reports', url: 'https://www.gao.gov', type: 'government' },
    { name: 'OPM', url: 'https://www.opm.gov', type: 'government' },
    { name: 'GSA Plain-Language', url: 'https://plainlanguage.gov', type: 'government' },
    { name: 'Section 508 Standards', url: 'https://www.section508.gov', type: 'standards' },
    { name: 'Code of Federal Regs', url: 'https://www.ecfr.gov', type: 'regulation' },
    { name: 'White House Briefings', url: 'https://www.whitehouse.gov', type: 'government' },
    { name: 'FedRAMP Marketplace', url: 'https://marketplace.fedramp.gov', type: 'standards' },
  ],
  legal: [
    { name: 'ABA Model Rules', url: 'https://www.americanbar.org', type: 'professional' },
    { name: 'ABA Ethics Opinions', url: 'https://www.americanbar.org', type: 'professional' },
    { name: 'State Bar Opinions', url: 'https://www.americanbar.org', type: 'professional' },
    { name: 'Cornell Legal Info Inst', url: 'https://www.law.cornell.edu', type: 'reference' },
    { name: 'PACER Court Records', url: 'https://pacer.uscourts.gov', type: 'court' },
    { name: 'Westlaw Headnotes', url: 'https://www.westlaw.com', type: 'reference' },
    { name: 'Supreme Court Opinions', url: 'https://www.supremecourt.gov', type: 'court' },
    { name: 'Federal Rules of Civ Pro', url: 'https://www.uscourts.gov', type: 'regulation' },
  ],
};

export function getSeedSources(industry: Industry): typeof SEED_SOURCES[Industry] {
  return SEED_SOURCES[industry];
}
