import Link from 'next/link';
import type { Category } from '@/lib/types';
import { bouwCategorieboom } from '@/lib/data';

type Props = {
  categorieen: Category[];
  actieveSlug?: string;
  aantalPerCategorie: Record<string, number>;
};

export function CategorieBoom({ categorieen, actieveSlug, aantalPerCategorie }: Props) {
  const boom = bouwCategorieboom(categorieen);

  return (
    <nav className="kb-card p-3">
      <div className="kb-label mb-2 px-2">Categorieën</div>
      <ul className="space-y-0.5">
        <li>
          <Link
            href="/bibliotheek"
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[14px] transition-colors ${
              !actieveSlug ? 'bg-navy text-white' : 'text-ink-soft hover:bg-page'
            }`}
          >
            Alle artikelen
          </Link>
        </li>
        {boom.map((c) => (
          <Knoop
            key={c.id}
            categorie={c}
            actieveSlug={actieveSlug}
            aantalPerCategorie={aantalPerCategorie}
            niveau={0}
          />
        ))}
      </ul>
    </nav>
  );
}

type Knoop = Category & { kinderen: Knoop[] };

function Knoop({
  categorie,
  actieveSlug,
  aantalPerCategorie,
  niveau,
}: {
  categorie: Knoop;
  actieveSlug?: string;
  aantalPerCategorie: Record<string, number>;
  niveau: number;
}) {
  const actief = categorie.slug === actieveSlug;
  const aantal = aantalPerCategorie[categorie.id] ?? 0;

  return (
    <li>
      <Link
        href={`/bibliotheek?categorie=${categorie.slug}`}
        style={{ paddingLeft: `${8 + niveau * 14}px` }}
        className={`flex items-center justify-between rounded-md py-1.5 pr-2 text-[14px] transition-colors ${
          actief ? 'bg-navy text-white' : 'text-ink-soft hover:bg-page'
        }`}
      >
        <span>{categorie.name}</span>
        {aantal > 0 && (
          <span className={`text-[12px] ${actief ? 'text-white/70' : 'text-muted'}`}>{aantal}</span>
        )}
      </Link>
      {categorie.kinderen.length > 0 && (
        <ul>
          {categorie.kinderen.map((k) => (
            <Knoop
              key={k.id}
              categorie={k}
              actieveSlug={actieveSlug}
              aantalPerCategorie={aantalPerCategorie}
              niveau={niveau + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
