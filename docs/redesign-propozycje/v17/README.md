# Makiety V17 PRO Portalu

- `wspolne.css`, `wspolne.js` — rama z LoT App (kopia 19.11); w `wspolne.js` menu Portalu (`MENU_LIDER`, `DOL_LIDER`; gość = `data-rola="gosc"`).
- `fixtura-portal.js` — WYGENEROWANE: `node audyt/harness/v17-fixtura-portal.mjs`. Dane wyłącznie fikcyjne.
- Ekran: `<ekran>.html` z `<body data-ekran="Panel">`, `<link rel="stylesheet" href="wspolne.css">`, `<script src="fixtura-portal.js">`, `<script src="wspolne.js">`.
- Zrzuty: `node audyt/harness/v17-makiety-zrzuty.mjs docs/redesign-propozycje/v17/<ekran>.html <ekran> [stany…]` → `audyt/zrzuty/v17-<ekran>-*.png`.
- Makiety ładują fonty z Google Fonts i Phosphor z unpkg — WOLNO tylko tutaj (pliki lokalne). W kodzie Portalu: `next/font` + `@phosphor-icons/react` (ADR-009).

## Poprawki z kodu
| Data | Ekran | Co w makiecie było nie tak | Poprawka | Zgłoszone Maciejowi |
|---|---|---|---|---|
