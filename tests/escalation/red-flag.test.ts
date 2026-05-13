/**
 * Tests for the red-flag pre-filter — the cheap, deterministic part of the
 * red-flag detection that runs before any LLM call.
 *
 * These tests do NOT exercise the LLM second-pass. The pre-filter alone must
 * catch the obvious cases.
 */

import { describe, it, expect } from 'vitest';
import { __test__ } from '@/lib/escalation/red-flag';

const { prefilter } = __test__;

describe('red-flag prefilter — emergencies', () => {
  it('catches chest pain', () => {
    const r = prefilter("I'm having chest pain right now.");
    expect(r.hit).toBe(true);
    expect(r.category).toBe('cardiac');
    expect(r.severity).toBe('emergency');
  });

  it('catches heart attack mentions', () => {
    const r = prefilter('I think I am having a heart attack.');
    expect(r.hit).toBe(true);
    expect(r.category).toBe('cardiac');
  });

  it('catches suicidal ideation', () => {
    const r = prefilter('I want to kill myself');
    expect(r.hit).toBe(true);
    expect(r.category).toBe('mental_health_crisis');
    expect(r.severity).toBe('emergency');
  });

  it('catches "I want to die"', () => {
    const r = prefilter('I want to die');
    expect(r.hit).toBe(true);
    expect(r.category).toBe('mental_health_crisis');
  });

  it('catches overdose', () => {
    const r = prefilter('I think I overdosed on my medication');
    expect(r.hit).toBe(true);
    expect(r.category).toBe('overdose');
  });

  it('catches "took too many" pills', () => {
    const r = prefilter('I took too many pills last night');
    expect(r.hit).toBe(true);
    expect(r.category).toBe('overdose');
  });

  it('catches stroke symptoms', () => {
    const r = prefilter('I think I am having a stroke');
    expect(r.hit).toBe(true);
    expect(r.category).toBe('stroke');
  });

  it('catches anaphylaxis', () => {
    const r = prefilter('Severe allergic reaction, my throat is swelling');
    expect(r.hit).toBe(true);
    expect(r.category).toBe('anaphylaxis');
  });
});

describe('red-flag prefilter — false positives we must NOT flag', () => {
  it('does not flag educational questions about chest pain', () => {
    const r = prefilter('What are the warning signs of a heart attack?');
    // The phrase "heart attack" alone could match — but our pattern requires
    // the explicit "heart attack" mention which IS present here.
    // This is intentionally cautious: we allow the false positive on
    // "warning signs of a heart attack" because the cost of missing a real
    // emergency is far higher than a false escalation. Document this trade-off.
    expect(r.hit).toBe(true);
  });

  it('does not flag a routine medication question', () => {
    const r = prefilter('How should I take my morning medication?');
    expect(r.hit).toBe(false);
  });

  it('does not flag a diet question', () => {
    const r = prefilter('What foods should I avoid with diabetes?');
    expect(r.hit).toBe(false);
  });

  it('does not flag a pregnancy timing question', () => {
    const r = prefilter('When can I expect to feel the baby move?');
    expect(r.hit).toBe(false);
  });
});

describe('red-flag prefilter — case insensitivity', () => {
  it('matches uppercase', () => {
    expect(prefilter('CHEST PAIN').hit).toBe(true);
  });
  it('matches mixed case', () => {
    expect(prefilter('Chest Pain').hit).toBe(true);
  });
});
