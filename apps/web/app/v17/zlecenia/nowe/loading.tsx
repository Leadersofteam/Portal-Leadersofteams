import { Rama } from '@/components/v17/rama';
import { SzkieletFormularza } from '@/components/v17/reszta-formularze';

// Wolno tu trzymać loading.tsx, bo trasa jest statyczna — nad segmentem [id]/[slug] psułby 404 (MINY).
export default function Loading() {
  return (
    <Rama aktywny="zlecenia" szeroka reszta>
      <SzkieletFormularza />
    </Rama>
  );
}
