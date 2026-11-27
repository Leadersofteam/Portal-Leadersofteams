import { TrescPrywatnosc } from '@/components/legal/prywatnosc';
import { Dokument } from '@/components/v17p6/dokument';

export { metadata } from '@/app/prywatnosc/page';

export default function Strona() {
  return <Dokument aktywny="/prywatnosc" tresc={TrescPrywatnosc()} />;
}
