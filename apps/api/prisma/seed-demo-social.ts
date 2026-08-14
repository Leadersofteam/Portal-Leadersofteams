// Warstwa SPOŁECZNOŚCIOWA danych demo — wpisy portalowe, posty w grupach,
// obserwowanie, komentarze i „doceniam".
//
// DLACZEGO OSOBNY PLIK: `seed-demo.ts` powstał przed modułem `social` (S7/S8)
// i przed obrazami/cytowaniem (S14), więc feed i grupy zostawały puste nawet na
// stagingu z „pełnymi" danymi demo. To była dokładnie ta luka, którą właściciel
// zgłosił jako „brakuje przykładowych danych i postów oraz grup".
//
// ZASADA: przechodzimy PRAWDZIWĄ ŚCIEŻKĄ KODU, nie wpisujemy stanu ręcznie.
//  - obrazy idą przez `filesService.store()` (ta sama konwersja webp i wycinanie
//    EXIF co przy realnym uploadzie),
//  - oś aktywności buduje `socialService.onSocialPostPublished/onPostPublished`
//    — czyli TEN SAM konsument, którego wywołuje worker.
// Wpisywanie `ActivityItem` wprost byłoby szybsze, ale omijałoby logikę projekcji
// i ukryło jej ewentualne awarie — a to jest kod, na którym stoi cały feed.
import { createFilesService } from '../src/modules/files/service';
import { createIdentityService } from '../src/modules/identity/service';
import { createLadderService } from '../src/modules/ladder/service';
import { createSocialService } from '../src/modules/social/service';
import type { PrismaClient } from '../src/shared/db';

const DAY = 86_400_000;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

export interface DemoLeaderRef {
  key: string;
  userId: string;
  displayName: string;
  industrySlug: string;
}

/** Prosty kadr „ze slajdu" — gradient + podpis. Rysowany u nas, zero stocków (ADR-009). */
function slideSvg(title: string, subtitle: string, from: string, to: string): Buffer {
  const escape = (s: string) =>
    s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${from}"/>
          <stop offset="100%" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="750" fill="url(#g)"/>
      <text x="80" y="330" font-family="Helvetica,Arial,sans-serif" font-size="64"
            font-weight="700" fill="#ffffff">${escape(title)}</text>
      <text x="80" y="410" font-family="Helvetica,Arial,sans-serif" font-size="34"
            fill="#ffffff" opacity="0.82">${escape(subtitle)}</text>
      <rect x="80" y="460" width="120" height="6" fill="#ffffff" opacity="0.6"/>
    </svg>`,
  );
}

const PALETTE: Array<[string, string]> = [
  ['#1e2a63', '#3d2a6b'],
  ['#123a34', '#1e5f4a'],
  ['#4a2418', '#7a3b1e'],
  ['#26224d', '#4b2a5e'],
  ['#0f2f4a', '#1b5673'],
];

/** Wpisy portalowe: treść, opcjonalny obraz, opcjonalny cytat innego wpisu. */
const POSTS: Array<{
  leaderIdx: number;
  hours: number;
  body: string;
  image?: { title: string; subtitle: string };
  quotesIdx?: number; // indeks WCZEŚNIEJSZEGO wpisu z tej listy
}> = [
  {
    leaderIdx: 0,
    hours: 190,
    body: 'Skończyliśmy migrację 40-osobowego zespołu na nowy proces rekrutacyjny. Największa zmiana nie była w narzędziu, tylko w tym, że rekruter przestał być listonoszem między działami. #HR #rekrutacja',
    image: { title: 'Rekrutacja: 34 dni → 18', subtitle: 'Skrócenie procesu bez cięcia jakości' },
  },
  {
    leaderIdx: 1,
    hours: 176,
    body: 'Pytanie do zespołów sprzedaży: ile z Waszych etapów lejka istnieje dlatego, że są potrzebne, a ile dlatego, że kiedyś ktoś je dodał i nikt nie odważył się usunąć? #sprzedaz #procesy',
  },
  {
    leaderIdx: 2,
    hours: 168,
    body: 'Trzy rzeczy, które powtarzam każdemu zespołowi wdrażającemu automatyzację: zacznij od procesu, który boli; zmierz go PRZED zmianą; nie automatyzuj wyjątków w pierwszym miesiącu. #AI #automatyzacja #procesy',
    image: { title: 'Automatyzacja bez chaosu', subtitle: 'Kolejność, która ratuje wdrożenie' },
  },
  {
    leaderIdx: 3,
    hours: 150,
    body: 'Dwa tygodnie z zespołem e-commerce: przepisaliśmy opisy 200 produktów pod realne pytania klientów z czatu, nie pod frazy z narzędzia. Konwersja w kategorii wzrosła, ale ważniejsze — spadła liczba zwrotów. #ecommerce #UX',
  },
  {
    leaderIdx: 1,
    hours: 144,
    body: 'Dokładnie to. U nas usunięcie dwóch etapów skróciło cykl o tydzień i nikt nie zauważył straty.',
    quotesIdx: 1,
  },
  {
    leaderIdx: 4,
    hours: 120,
    body: 'Najtrudniejsza część pracy z zarządem to nie przygotowanie danych, tylko pokazanie ich tak, żeby decyzja była oczywista. Jeden slajd, jedna liczba, jedna rekomendacja. #dane #przywodztwo',
    image: { title: 'Jeden slajd, jedna decyzja', subtitle: 'Jak rozmawiać z zarządem o danych' },
  },
  {
    leaderIdx: 5,
    hours: 96,
    body: 'Zrobiłem przegląd 12 procesów onboardingowych w firmach produkcyjnych. Wniosek: te, które działają, mają jedną wspólną cechę — konkretną osobę odpowiedzialną za pierwsze 30 dni nowego pracownika. #onboarding #HR',
  },
  {
    leaderIdx: 0,
    hours: 72,
    body: 'Warto przeczytać — u nas identycznie. Odpowiedzialność za pierwsze 30 dni rozmyta między HR a przełożonym to najczęstszy powód, dla którego ktoś odchodzi w trzecim miesiącu.',
    quotesIdx: 6,
  },
  {
    leaderIdx: 2,
    hours: 60,
    body: 'Krótka obserwacja z ostatniego kwartału: zespoły, które mają rytm cotygodniowego przeglądu, wdrażają zmiany dwa razy szybciej niż te, które „spotykają się, gdy trzeba". #procesy #przywodztwo',
  },
  {
    leaderIdx: 6,
    hours: 48,
    body: 'Skończyłem audyt UX sklepu z branży wyposażenia wnętrz. Trzy zmiany na karcie produktu, zero zmian w silniku — i o 20% mniej porzuceń koszyka. Czasem nie trzeba przebudowy. #UX #ecommerce',
    image: { title: 'Trzy zmiany, 20% mniej porzuceń', subtitle: 'Audyt UX karty produktu' },
  },
  {
    leaderIdx: 3,
    hours: 36,
    body: 'Szukam kogoś, kto ogarnia logistykę zwrotów w e-commerce przy skali ~2000 paczek miesięcznie. Jeśli robiliście to u siebie — odezwijcie się, mam konkretny problem do rozwiązania. #ecommerce #logistyka',
  },
  {
    leaderIdx: 4,
    hours: 20,
    body: 'Dziś krótko: jeśli Twój raport wymaga tłumaczenia, to nie jest raport, tylko notatka robocza.',
  },
  {
    leaderIdx: 5,
    hours: 8,
    body: 'Kończę tydzień z zespołem produkcyjnym. Wdrożyliśmy tablicę stanu zmiany — zwykłą, fizyczną. Cyfryzacja przyjdzie później, najpierw musieli zobaczyć własny proces. #procesy #produkcja',
    image: { title: 'Najpierw zobacz proces', subtitle: 'Tablica zmiany przed cyfryzacją' },
  },
];

/** Dyskusje w grupach branżowych — tam, gdzie dziś jest zupełna cisza. */
const GROUP_POSTS: Array<{
  leaderIdx: number;
  industrySlug: string;
  hours: number;
  title: string;
  body: string;
  comments: Array<{ leaderIdx: number; body: string }>;
}> = [
  {
    leaderIdx: 0,
    industrySlug: 'hr',
    hours: 160,
    title: 'Jak mierzycie jakość rekrutacji poza czasem zatrudnienia? #HR',
    body: 'Czas zatrudnienia jest łatwy do policzenia i dlatego wszyscy go raportują. Ale nie mówi nic o tym, czy zatrudniliśmy dobrze. U nas zaczęliśmy patrzeć na odsetek osób, które zostają dłużej niż rok, i na ocenę przełożonego po trzech miesiącach. Co działa u Was?',
    comments: [
      {
        leaderIdx: 5,
        body: 'Dokładamy do tego jedno pytanie do zespołu po 30 dniach: „czy ta osoba wie, za co odpowiada?". Zaskakująco często odpowiedź brzmi nie — i to jest problem onboardingu, nie rekrutacji.',
      },
      {
        leaderIdx: 1,
        body: 'U nas najlepszym wskaźnikiem okazała się liczba osób, które po roku poleciły znajomego. Trudno oszukać.',
      },
    ],
  },
  {
    leaderIdx: 2,
    industrySlug: 'ai-automatyzacja',
    hours: 130,
    title: 'Automatyzacja procesu, który nie jest opisany — da się? #automatyzacja',
    body: 'Klasyka: firma chce zautomatyzować obieg dokumentów, ale nikt nie potrafi opisać, jak on dziś wygląda. Moje podejście: dwa tygodnie obserwacji i nagrywania ekranu (za zgodą), potem mapa, dopiero potem narzędzie. Wolniej na starcie, dużo taniej na końcu.',
    comments: [
      {
        leaderIdx: 4,
        body: 'Podpisuję się. Największe wdrożeniowe katastrofy, jakie widziałem, zaczynały się od zakupu licencji przed mapą procesu.',
      },
      {
        leaderIdx: 0,
        body: 'Dodałbym jedno: mapę robi się z osobami, które ten proces wykonują, nie z ich przełożonymi. To dwa różne procesy.',
      },
    ],
  },
  {
    leaderIdx: 1,
    industrySlug: 'sprzedaz',
    hours: 90,
    title: 'Lejek sprzedażowy: ile etapów to za dużo? #sprzedaz',
    body: 'Widzę u klientów lejki po 9–11 etapów. Handlowcy przestają je uzupełniać, dane przestają być prawdziwe, a zarząd podejmuje decyzje na fikcji. Moja teza: powyżej 6 etapów tracisz jakość danych szybciej, niż zyskujesz na precyzji.',
    comments: [
      {
        leaderIdx: 3,
        body: 'U nas 5 etapów i jedno pole „powód przegranej". To pole dało nam więcej niż cały poprzedni lejek.',
      },
    ],
  },
  {
    leaderIdx: 6,
    industrySlug: 'design-ux',
    hours: 40,
    title: 'Badania z użytkownikami przy budżecie bliskim zeru #UX',
    body: 'Nie każdy klient ma na panel badawczy. Robię wtedy pięć rozmów po 30 minut z realnymi klientami z listy obsługi posprzedażowej — zwykle wystarcza, żeby zobaczyć te same trzy problemy. Jak Wy sobie radzicie bez budżetu?',
    comments: [
      {
        leaderIdx: 2,
        body: 'Nagrania z czatu obsługi. Darmowe, szczere i już je macie — trzeba tylko usiąść i przeczytać sto rozmów.',
      },
    ],
  },
];

export async function seedSocialLayer(
  prisma: PrismaClient,
  leaders: DemoLeaderRef[],
  opts: { uploadsDir: string },
) {
  if (leaders.length < 4) {
    throw new Error('seed-demo-social: potrzeba co najmniej 4 Liderów demo');
  }

  const identity = createIdentityService(prisma);
  const ladder = createLadderService(prisma);
  const files = createFilesService(prisma, {
    uploadsDir: opts.uploadsDir,
    maxUploadBytes: 5_242_880,
  });
  const social = createSocialService({ prisma, identity, ladder, files });

  const at = (idx: number) => leaders[idx % leaders.length]!;

  // --- Uchwyty @handle: bez nich autor w feedzie nie ma linku do profilu -----
  for (const l of leaders) await identity.ensureHandle(l.userId);

  // --- Obserwowanie ---------------------------------------------------------
  // Graf celowo NIERÓWNOMIERNY: każdy obserwuje kilku, nie wszystkich. Feed
  // „Obserwowani" ma pokazywać różnicę wobec „Całej społeczności", a przy
  // grafie pełnym obie zakładki wyglądałyby identycznie.
  let follows = 0;
  for (let i = 0; i < leaders.length; i += 1) {
    for (const offset of [1, 2, 4]) {
      const target = leaders[(i + offset) % leaders.length]!;
      if (target.userId === leaders[i]!.userId) continue;
      const created = await prisma.follow.createMany({
        data: [{ followerId: leaders[i]!.userId, followedId: target.userId }],
        skipDuplicates: true,
      });
      follows += created.count;
    }
  }

  // --- Wpisy portalowe ------------------------------------------------------
  const postIds: string[] = [];
  let imageCount = 0;
  for (const [idx, spec] of POSTS.entries()) {
    const author = at(spec.leaderIdx);
    const createdAt = hoursAgo(spec.hours);

    let imageFileId: string | null = null;
    if (spec.image) {
      const [from, to] = PALETTE[imageCount % PALETTE.length]!;
      const stored = await files.store({
        ownerId: author.userId,
        kind: 'SOCIAL',
        originalName: 'kadr.png',
        mime: 'image/png',
        buffer: slideSvg(spec.image.title, spec.image.subtitle, from, to),
      });
      imageFileId = stored.id;
      imageCount += 1;
    }

    const quotedPostId =
      spec.quotesIdx !== undefined && postIds[spec.quotesIdx] ? postIds[spec.quotesIdx]! : null;

    const post = await prisma.socialPost.create({
      data: { authorUserId: author.userId, body: spec.body, quotedPostId, createdAt },
    });
    postIds.push(post.id);

    if (imageFileId) {
      await prisma.socialPostImage.create({
        data: { postId: post.id, fileId: imageFileId, position: 0 },
      });
    }

    // Projekcja feedu PRAWDZIWYM konsumentem (tym samym, którego wywołuje worker).
    await social.onSocialPostPublished({ postId: post.id, authorUserId: author.userId });
    // ActivityItem powstaje z `now()`, a my chcemy oś rozłożoną w czasie —
    // inaczej cały feed miałby jeden znacznik i kolejność byłaby przypadkowa.
    await prisma.activityItem.updateMany({
      where: { type: 'SOCIAL_POST_PUBLISHED', subjectId: post.id },
      data: { createdAt },
    });

    // Komentarze i „doceniam" od innych — kilka wpisów zostawiamy bez reakcji,
    // bo feed, w którym KAŻDY wpis ma komplet interakcji, wygląda nieprawdziwie.
    if (idx % 3 !== 2) {
      const commenter = at(spec.leaderIdx + 3);
      await prisma.socialComment.create({
        data: {
          postId: post.id,
          authorUserId: commenter.userId,
          body: 'Konkret. Podeślij proszę więcej szczegółów — mierzyliśmy to u siebie inaczej i wychodzą nam podobne wnioski.',
          createdAt: new Date(createdAt.getTime() + 3_600_000),
        },
      });
    }
    for (const offset of [1, 2, 5]) {
      if ((idx + offset) % 4 === 0) continue;
      const fan = at(spec.leaderIdx + offset);
      if (fan.userId === author.userId) continue;
      await prisma.socialReaction.createMany({
        data: [{ postId: post.id, userId: fan.userId }],
        skipDuplicates: true,
      });
    }
  }

  // --- Posty w grupach branżowych ------------------------------------------
  const groups = await prisma.group.findMany({
    where: { isSystem: true },
    include: { industry: true },
  });
  const groupBySlug = new Map(groups.map((g) => [g.industry?.slug ?? '', g]));

  let groupPostCount = 0;
  for (const spec of GROUP_POSTS) {
    const group = groupBySlug.get(spec.industrySlug);
    if (!group) continue;
    const author = at(spec.leaderIdx);
    const createdAt = hoursAgo(spec.hours);

    // Autor i komentujący muszą być członkami grupy — inaczej treść istnieje,
    // ale w UI wygląda jak wpis kogoś z zewnątrz.
    const participants = [author, ...spec.comments.map((c) => at(c.leaderIdx))];
    for (const p of participants) {
      await prisma.groupMembership.upsert({
        where: { groupId_userId: { groupId: group.id, userId: p.userId } },
        update: {},
        create: { groupId: group.id, userId: p.userId, role: 'MEMBER', status: 'ACTIVE' },
      });
    }

    const post = await prisma.post.create({
      data: {
        groupId: group.id,
        authorUserId: author.userId,
        type: 'DISCUSSION',
        title: spec.title,
        body: spec.body,
        createdAt,
      },
    });
    groupPostCount += 1;

    for (const [i, c] of spec.comments.entries()) {
      await prisma.comment.create({
        data: {
          postId: post.id,
          authorUserId: at(c.leaderIdx).userId,
          body: c.body,
          createdAt: new Date(createdAt.getTime() + (i + 1) * 5_400_000),
        },
      });
    }
    for (const offset of [1, 3]) {
      const fan = at(spec.leaderIdx + offset);
      if (fan.userId === author.userId) continue;
      await prisma.reaction.createMany({
        data: [{ postId: post.id, userId: fan.userId }],
        skipDuplicates: true,
      });
    }

    await social.onPostPublished({
      postId: post.id,
      groupId: group.id,
      authorUserId: author.userId,
    });
    await prisma.activityItem.updateMany({
      where: { type: 'POST_PUBLISHED', subjectId: post.id },
      data: { createdAt },
    });
  }

  return {
    follows,
    posts: postIds.length,
    images: imageCount,
    groupPosts: groupPostCount,
    days: Math.round(Math.max(...POSTS.map((p) => p.hours)) / 24),
    DAY,
  };
}
