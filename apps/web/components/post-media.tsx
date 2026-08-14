import { fileVariantUrl } from '@lot/contracts';

/**
 * Obrazy przy wpisie portalowym (1–4).
 *
 * Siatka zmienia się z liczbą zdjęć, bo jedno zdjęcie w kratce 2×2 wygląda jak
 * błąd. Wysokość jest ustalona proporcją, nie pikselami — dzięki temu feed nie
 * skacze podczas doczytywania obrazów (przesunięcie treści pod palcem to jeden
 * z najbardziej irytujących błędów na telefonie).
 *
 * Miniatura (`thumb`) w feedzie, pełny wariant dopiero po kliknięciu: na 390 px
 * przez sieć komórkową nikt nie chce pobierać czterech obrazów 1280 px.
 */
export function PostMedia({ fileIds, alt }: { fileIds: string[]; alt: string }) {
  if (fileIds.length === 0) return null;
  return (
    <div className="post-media" data-count={Math.min(fileIds.length, 4)}>
      {fileIds.slice(0, 4).map((fileId, i) => (
        <a
          key={fileId}
          href={fileVariantUrl(fileId, 'full')}
          target="_blank"
          rel="noreferrer"
          className="post-media-item"
        >
          {/* Bez next/image: obrazy idą z naszego API pod stałym URL-em wariantu,
              a optymalizator Next dokładałby drugą warstwę przetwarzania tego,
              co sharp już zmniejszył przy uploadzie. */}
          <img
            src={fileVariantUrl(fileId, 'thumb')}
            alt={fileIds.length > 1 ? `${alt} — obraz ${i + 1} z ${fileIds.length}` : alt}
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
