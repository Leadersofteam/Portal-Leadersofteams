import { Suspense } from 'react';

import { Dwie } from '@/components/v17p6/czesci';
import { RamaPubliczna } from '@/components/v17p6/rama';

import { Czekanie, WypisV17 } from './wypis';

export { metadata } from '@/app/wypis-digest/page';

export default function WypisPage() {
  return (
    <RamaPubliczna>
      <Dwie>
        <Suspense fallback={<Czekanie />}>
          <WypisV17 />
        </Suspense>
      </Dwie>
    </RamaPubliczna>
  );
}
