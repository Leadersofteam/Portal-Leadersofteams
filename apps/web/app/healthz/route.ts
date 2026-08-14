// Sonda zdrowia kontenera `web` (S18). Powstała nie dla samego zdrowia, tylko
// dlatego, że POPRZEDNIA sonda uderzała w `/` co 15 s i była liczona jako
// odsłona: 14.08 na produkcji `/` miało 3926 „wejść" na dobę, a każda inna
// strona 2–3. Filtr botów w middleware nie odsiewał jej, bo `fetch` z Node
// przedstawia się jako `node`, a nie jako crawler.
//
// `force-dynamic` jest tu ISTOTNE. Statyczna odpowiedź dowodziłaby wyłącznie,
// że serwer oddaje plik z dysku; poprzednia sonda (`/`) dowodziła, że Next
// RENDERUJE. Wymuszony render trzyma sondę tak samo mocną, jak była — inaczej
// zamienilibyśmy fałszywą statystykę na fałszywe zdrowie.
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
