'use client';

import {
  Bell,
  BookmarkSimple,
  Briefcase,
  Buildings,
  Hash,
  Ladder,
  type Icon,
  Path,
  PlusCircle,
  Question,
  Rss,
  SquaresFour,
  Storefront,
  Tag,
  UserCircle,
  UsersFour,
  UsersThree,
  DotsThreeOutline,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  X,
} from '@phosphor-icons/react';

// Ikony Phosphor — wyjątek od „ikony rysujemy sami" (decyzja Macieja 19.11).
// Paczka npm, zero sieci w runtime (ADR-009). Importy nazwane → tree-shaking.
const MAP: Record<string, Icon> = {
  Bell,
  BookmarkSimple,
  Briefcase,
  Buildings,
  Hash,
  Ladder,
  Path,
  PlusCircle,
  Question,
  Rss,
  SquaresFour,
  Storefront,
  Tag,
  UserCircle,
  UsersFour,
  UsersThree,
  DotsThreeOutline,
};

export function V17Icon({
  name,
  bold = false,
  size = 20,
}: {
  name: string;
  bold?: boolean;
  size?: number;
}) {
  const C = MAP[name] ?? Hash;
  return <C size={size} weight={bold ? 'bold' : 'duotone'} aria-hidden="true" />;
}

export { MagnifyingGlass, CaretLeft, CaretRight, X };
