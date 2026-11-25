import { Rama } from '@/components/v17/rama';
import { SzkieletStrumienia } from '@/components/v17/karty';

// loading.tsx leży OBOK page.tsx listy (/feed). Nigdy nad [id]/[handle] — wtedy strona zwraca 200
// zamiast 404 (MINY).
export default function Loading() {
  return (
    <Rama aktywny="feed" ja={null}>
      <div className="naglowek">
        <h1>Strumień</h1>
      </div>
      <SzkieletStrumienia />
    </Rama>
  );
}
