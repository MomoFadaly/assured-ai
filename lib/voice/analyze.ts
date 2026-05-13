/**
 * Brand voice analyzer.
 *
 * Extracts a "voice profile" from a corpus of sample articles — reading level,
 * sentence/paragraph rhythm, vocabulary richness, structural patterns. The
 * resulting metrics describe a publisher's house style well enough to score
 * new content for stylistic match without an LLM call.
 *
 * Pure JS. No model required.
 */

export interface VoiceMetrics {
  total_words: number;
  total_sentences: number;
  total_paragraphs: number;

  flesch_kincaid_grade: number;
  flesch_reading_ease: number;
  avg_sentence_length_words: number;
  avg_word_length_chars: number;
  avg_paragraph_length_sentences: number;

  type_token_ratio: number;
  question_ratio: number;
  exclamation_ratio: number;

  first_person_ratio: number;
  second_person_ratio: number;
  passive_indicator_ratio: number;

  citation_density_per_1000: number;
  number_density_per_1000: number;
  bullet_density_per_1000: number;
}

export function analyzeText(text: string): VoiceMetrics {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return emptyMetrics();
  }

  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const sentences = splitSentencesSimple(trimmed);
  const words = trimmed.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const lowered = words.map((w) => w.toLowerCase());
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const uniqueWords = new Set(lowered);

  const questions = sentences.filter((s) => /\?\s*$/.test(s)).length;
  const exclamations = sentences.filter((s) => /!\s*$/.test(s)).length;

  const FIRST_PERSON = new Set(['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours']);
  const SECOND_PERSON = new Set(['you', 'your', 'yours', "you're", "you've"]);
  const PASSIVE_HINTS = new Set([
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
  ]);
  let firstPerson = 0;
  let secondPerson = 0;
  let passive = 0;
  for (let i = 0; i < lowered.length; i++) {
    const w = lowered[i] ?? '';
    if (FIRST_PERSON.has(w)) firstPerson++;
    if (SECOND_PERSON.has(w)) secondPerson++;
    if (PASSIVE_HINTS.has(w)) {
      const next = lowered[i + 1];
      if (next && /[a-z]ed$|en$/.test(next)) passive++;
    }
  }

  const citationMatches =
    trimmed.match(/\[\d+\]|\(([A-Z][A-Za-z]+(?:,\s?(?:19|20)\d{2}))\)/g) ?? [];
  const numberMatches = trimmed.match(/\b\d[\d,.]*\b/g) ?? [];
  const bulletMatches = trimmed.match(/^[\s]*[-*•]\s/gm) ?? [];

  const totalWords = words.length || 1;
  const totalSentences = sentences.length || 1;
  const totalParagraphs = paragraphs.length || 1;

  const avgSentenceLength = totalWords / totalSentences;
  const avgWordLength =
    words.reduce((sum, w) => sum + w.length, 0) / totalWords;
  const fkGrade =
    0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;
  const fkEase =
    206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);

  return {
    total_words: totalWords,
    total_sentences: totalSentences,
    total_paragraphs: totalParagraphs,

    flesch_kincaid_grade: round2(fkGrade),
    flesch_reading_ease: round2(fkEase),
    avg_sentence_length_words: round2(avgSentenceLength),
    avg_word_length_chars: round2(avgWordLength),
    avg_paragraph_length_sentences: round2(totalSentences / totalParagraphs),

    type_token_ratio: round3(uniqueWords.size / totalWords),
    question_ratio: round3(questions / totalSentences),
    exclamation_ratio: round3(exclamations / totalSentences),

    first_person_ratio: round3(firstPerson / totalWords),
    second_person_ratio: round3(secondPerson / totalWords),
    passive_indicator_ratio: round3(passive / totalSentences),

    citation_density_per_1000: round2((citationMatches.length * 1000) / totalWords),
    number_density_per_1000: round2((numberMatches.length * 1000) / totalWords),
    bullet_density_per_1000: round2((bulletMatches.length * 1000) / totalWords),
  };
}

/**
 * Average metrics across many samples to produce a profile.
 */
export function aggregateMetrics(samples: VoiceMetrics[]): VoiceMetrics {
  if (samples.length === 0) return emptyMetrics();
  const n = samples.length;
  const sum = samples.reduce(
    (acc, m) => {
      for (const k of NUMERIC_KEYS) {
        acc[k] = (acc[k] ?? 0) + m[k];
      }
      return acc;
    },
    {} as Record<keyof VoiceMetrics, number>,
  );
  const avg = {} as VoiceMetrics;
  for (const k of NUMERIC_KEYS) {
    avg[k] = round3(sum[k] / n);
  }
  return avg;
}

/**
 * Score how closely `candidate` matches the `profile`. Returns 0–100 where
 * 100 means identical. Uses normalized Manhattan distance across the key
 * dimensions writers actually notice.
 */
export interface VoiceMatchResult {
  match_score: number;
  weighted_distance: number;
  dimensions: Array<{
    key: keyof VoiceMetrics;
    profile_value: number;
    candidate_value: number;
    normalized_delta: number;
    weight: number;
    label: string;
  }>;
}

const DIMENSION_WEIGHTS: Partial<Record<keyof VoiceMetrics, number>> = {
  flesch_kincaid_grade: 1.0,
  avg_sentence_length_words: 0.9,
  avg_word_length_chars: 0.4,
  avg_paragraph_length_sentences: 0.6,
  type_token_ratio: 0.5,
  question_ratio: 0.4,
  first_person_ratio: 0.5,
  second_person_ratio: 0.7,
  passive_indicator_ratio: 0.5,
  bullet_density_per_1000: 0.3,
};

const DIMENSION_LABELS: Partial<Record<keyof VoiceMetrics, string>> = {
  flesch_kincaid_grade: 'Reading grade level',
  avg_sentence_length_words: 'Avg sentence length',
  avg_word_length_chars: 'Avg word length',
  avg_paragraph_length_sentences: 'Sentences per paragraph',
  type_token_ratio: 'Vocabulary richness',
  question_ratio: 'Question prevalence',
  first_person_ratio: 'First-person voice',
  second_person_ratio: 'Direct address ("you")',
  passive_indicator_ratio: 'Passive voice',
  bullet_density_per_1000: 'Bullet density',
};

const NORMALIZER: Partial<Record<keyof VoiceMetrics, number>> = {
  flesch_kincaid_grade: 6, // grade levels span 0..18, scale by 6
  avg_sentence_length_words: 8,
  avg_word_length_chars: 1.5,
  avg_paragraph_length_sentences: 3,
  type_token_ratio: 0.2,
  question_ratio: 0.15,
  first_person_ratio: 0.05,
  second_person_ratio: 0.05,
  passive_indicator_ratio: 0.15,
  bullet_density_per_1000: 20,
};

export function scoreAgainstProfile(
  profile: VoiceMetrics,
  candidate: VoiceMetrics,
): VoiceMatchResult {
  const dims: VoiceMatchResult['dimensions'] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const [k, weight] of Object.entries(DIMENSION_WEIGHTS) as Array<[
    keyof VoiceMetrics,
    number,
  ]>) {
    const norm = NORMALIZER[k] ?? 1;
    const delta = Math.abs((candidate[k] - profile[k]) / norm);
    weightedSum += delta * weight;
    weightTotal += weight;
    dims.push({
      key: k,
      profile_value: profile[k],
      candidate_value: candidate[k],
      normalized_delta: round3(delta),
      weight,
      label: DIMENSION_LABELS[k] ?? k,
    });
  }
  const avgDistance = weightedSum / Math.max(weightTotal, 0.001);
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - avgDistance))));
  return {
    match_score: score,
    weighted_distance: round3(avgDistance),
    dimensions: dims.sort((a, b) => b.normalized_delta * b.weight - a.normalized_delta * a.weight),
  };
}

// ============================================================
// Internals
// ============================================================

const NUMERIC_KEYS: Array<keyof VoiceMetrics> = [
  'total_words',
  'total_sentences',
  'total_paragraphs',
  'flesch_kincaid_grade',
  'flesch_reading_ease',
  'avg_sentence_length_words',
  'avg_word_length_chars',
  'avg_paragraph_length_sentences',
  'type_token_ratio',
  'question_ratio',
  'exclamation_ratio',
  'first_person_ratio',
  'second_person_ratio',
  'passive_indicator_ratio',
  'citation_density_per_1000',
  'number_density_per_1000',
  'bullet_density_per_1000',
];

function emptyMetrics(): VoiceMetrics {
  return {
    total_words: 0,
    total_sentences: 0,
    total_paragraphs: 0,
    flesch_kincaid_grade: 0,
    flesch_reading_ease: 0,
    avg_sentence_length_words: 0,
    avg_word_length_chars: 0,
    avg_paragraph_length_sentences: 0,
    type_token_ratio: 0,
    question_ratio: 0,
    exclamation_ratio: 0,
    first_person_ratio: 0,
    second_person_ratio: 0,
    passive_indicator_ratio: 0,
    citation_density_per_1000: 0,
    number_density_per_1000: 0,
    bullet_density_per_1000: 0,
  };
}

function splitSentencesSimple(text: string): string[] {
  // Cheaper splitter than the one in fact-check.ts; for stats we tolerate
  // small inaccuracies.
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+(?=\s|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s.length > 0) out.push(s);
  }
  // Catch trailing text without terminator
  const lastEnd = re.lastIndex;
  if (lastEnd < text.length) {
    const tail = text.slice(lastEnd).trim();
    if (tail.length > 0) out.push(tail);
  }
  return out;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return Math.max(1, w.length > 0 ? 1 : 0);
  const vowels = w.replace(/(?:[^aeiouy]+)/g, ' ').trim().split(/\s+/).filter(Boolean);
  let syllables = vowels.length;
  if (w.endsWith('e') && !w.endsWith('le')) syllables = Math.max(1, syllables - 1);
  if (w.endsWith('ed') && !/[td]ed$/.test(w)) syllables = Math.max(1, syllables - 1);
  return Math.max(1, syllables);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
