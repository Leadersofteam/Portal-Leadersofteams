import { TrescPrywatnosc } from '@/components/legal/prywatnosc';

export const metadata = {
  title: 'Polityka prywatności — Leaders of Teams',
  description: 'Polityka prywatności platformy leadersofteams.pl.',
};

export default function PrivacyPage() {
  return (
    <main>
      <TrescPrywatnosc />
    </main>
  );
}
