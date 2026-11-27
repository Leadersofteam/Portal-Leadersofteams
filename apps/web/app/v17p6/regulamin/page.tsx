import { TrescRegulamin } from '@/components/legal/regulamin';
import { Dokument } from '@/components/v17p6/dokument';

export { metadata } from '@/app/regulamin/page';

export default function Strona() {
  return <Dokument aktywny="/regulamin" tresc={TrescRegulamin()} />;
}
