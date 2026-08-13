import { describe, expect, it } from 'vitest';

import { toBooleanQuery } from './fulltext';

describe('toBooleanQuery', () => {
  it('buduje wyrażenie z prefiksami (to jest cały sens trybu boolowskiego)', () => {
    expect(toBooleanQuery('rekrutacja liderów')).toBe('+rekrutacja* +liderów*');
  });

  it('odrzuca tokeny krótsze niż próg indeksu — sygnalizuje to null, nie ciszą', () => {
    // „HR" i „AI" nie wejdą do FULLTEXT przy innodb_ft_min_token_size = 3.
    // Wołający MUSI wtedy użyć fallbacku (LIKE/tagi).
    expect(toBooleanQuery('HR AI')).toBeNull();
    expect(toBooleanQuery('   ')).toBeNull();
  });

  it('wycina znaki sterujące trybu boolowskiego', () => {
    const expr = toBooleanQuery('lider* -"drop table" (audyt)');
    expect(expr).not.toBeNull();
    expect(expr).toBe('+lider* +drop* +table* +audyt*');
    // Poza naszymi prefiksami nie zostaje żaden operator użytkownika.
    expect(expr!.replace(/\+\w+\*/gu, '').trim()).toBe('');
  });

  it('nie przepuszcza więcej niż 10 tokenów (koszt zapytania)', () => {
    const many = Array.from({ length: 20 }, (_, i) => `token${i}`).join(' ');
    expect(toBooleanQuery(many)!.split(' ')).toHaveLength(10);
  });

  it('mieszane frazy: krótkie słowa odpadają, długie zostają', () => {
    expect(toBooleanQuery('AI w rekrutacji')).toBe('+rekrutacji*');
  });
});
