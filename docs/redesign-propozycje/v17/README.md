# Makiety V17 PRO Portalu

- `wspolne.css`, `wspolne.js` — rama z LoT App (kopia 19.11); w `wspolne.js` menu Portalu (`MENU_LIDER`, `DOL_LIDER`; gość = `data-rola="gosc"`).
- `fixtura-portal.js` — WYGENEROWANE: `node audyt/harness/v17-fixtura-portal.mjs`. Dane wyłącznie fikcyjne.
- Ekran: `<ekran>.html` z `<body data-ekran="Panel">`, `<link rel="stylesheet" href="wspolne.css">`, `<script src="fixtura-portal.js">`, `<script src="wspolne.js">`.
- Zrzuty: `node audyt/harness/v17-makiety-zrzuty.mjs docs/redesign-propozycje/v17/<ekran>.html <ekran> [stany…]` → `audyt/zrzuty/v17-<ekran>-*.png`.
- Makiety ładują fonty z Google Fonts i Phosphor z unpkg — WOLNO tylko tutaj (pliki lokalne). W kodzie Portalu: `next/font` + `@phosphor-icons/react` (ADR-009).

## Poprawki z kodu
| Data | Ekran | Co w makiecie było nie tak | Poprawka | Zgłoszone Maciejowi |
|---|---|---|---|---|
| 19.11 | Panel | Dolne karty 1512 z pustką pod niższą kartą (P2 recenzji) | `align-items:start` na siatce | w kodzie i makiecie |
| 19.11 | Panel | „W toku” dwa razy w karcie na żywo (plakietka + wiersz) | zostaje tylko plakietka w nagłówku | w kodzie i makiecie |
| 19.11 | Panel | „Zlecenia w Twojej branży” — API nie filtruje po branży Lidera | karta „Nowe zlecenia” z `/orders?limit=2` (bez nowego endpointu) | **do decyzji Macieja** |
| 19.11 | Panel | Powiadomienia z treścią — `payload` powiadomienia jest nieczytelny dla widoku | karta pokazuje liczbę nieprzeczytanych z `/me/notifications/unread-count` | **do decyzji Macieja** |
| 19.11 | Panel | „Na żywo”: termin i budżet zlecenia — brak w `/me/offers` i `/me/orders` | kafle „Twoja oferta / Wiadomości” (Lider) albo „Firma / Ofert” (firma) | **do decyzji Macieja** |
