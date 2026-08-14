// Testy parsera tematów. JEDNOSTKOWE, więc wykonują się ZAWSZE — inaczej niż
// integracyjne, które bez DATABASE_URL zielenią się przez pominięcie.
import { describe, expect, it } from 'vitest';

import { extractTopics, MAX_TOPICS_PER_CONTENT, topicSlug } from './topics';

describe('topicSlug', () => {
  it('sprowadza warianty pisowni do jednego klucza', () => {
    // Bez tego rozmowa rozpadłaby się na „#Rekrutacja" i „#rekrutacja" jako
    // dwa osobne tematy — a dla piszącego to jedno i to samo słowo.
    expect(topicSlug('Rekrutacja')).toBe('rekrutacja');
    expect(topicSlug('REKRUTACJA')).toBe('rekrutacja');
    expect(topicSlug('rekrutacja')).toBe('rekrutacja');
  });

  it('transliteruje polskie znaki', () => {
    expect(topicSlug('jakość')).toBe('jakosc');
    expect(topicSlug('zarządzanie')).toBe('zarzadzanie');
    expect(topicSlug('Łódź')).toBe('lodz');
  });
});

describe('extractTopics', () => {
  it('wydobywa tematy z treści i zachowuje pisownię autora', () => {
    const found = extractTopics('Wnioski z wdrożenia #AI w #HR — polecam.');
    expect(found).toEqual([
      { name: 'AI', slug: 'ai' },
      { name: 'HR', slug: 'hr' },
    ]);
  });

  it('to samo słowo w dwóch pisowniach liczy się RAZ', () => {
    const found = extractTopics('#Rekrutacja i jeszcze raz #rekrutacja');
    expect(found).toHaveLength(1);
    // Wygrywa pierwsze użycie — pokazujemy pisownię, którą autor wybrał najpierw.
    expect(found[0]).toEqual({ name: 'Rekrutacja', slug: 'rekrutacja' });
  });

  it('nie robi tematu z samych cyfr', () => {
    // „#2026" i „#1" to zwykle numery, nie kategorie rozmowy.
    expect(extractTopics('Plan na #2026 i punkt #1')).toEqual([]);
  });

  it('respektuje limit antyspamowy i NIE odrzuca całej treści', () => {
    const many = extractTopics('#a1 #b2 #c3 #d4 #e5 #f6 #g7 #h8');
    expect(many).toHaveLength(MAX_TOPICS_PER_CONTENT);
  });

  it('ignoruje adres e-mail i nie myli go z tematem', () => {
    expect(extractTopics('napisz na kontakt@firma.pl')).toEqual([]);
  });

  it('radzi sobie z tematem na końcu zdania i w nawiasie', () => {
    const found = extractTopics('Świetne (#UX). Więcej o #onboardingu.');
    expect(found.map((t) => t.slug)).toEqual(['ux', 'onboardingu']);
  });
});
