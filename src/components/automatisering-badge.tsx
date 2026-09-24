import type { AutomationStatus } from '@/lib/types';
import type { Berichten } from '@/lib/vertalingen';

const OPMAAK: Record<AutomationStatus | 'onbekend', string> = {
  auto: 'border-[#9ad9c2] bg-[#eaf7f1] text-[#1d5c46]',
  half: 'border-[#f5c77e] bg-[#fff6e6] text-[#8a4a12]',
  manual: 'border-[#f1a79f] bg-[#fdeeec] text-[#a93226]',
  nvt: 'border-line bg-page text-muted',
  onbekend: 'border-dashed border-[#aab] bg-white text-muted',
};

/** Statuslabel voor één onderdeel van het orderproces; null = nog niet ingevuld. */
export function AutomatiseringBadge({ status, t }: { status: AutomationStatus | null; t: Berichten }) {
  const sleutel = status ?? 'onbekend';
  return (
    <span
      title={t.leveranciers.legenda[sleutel]}
      className={`inline-flex min-w-[64px] justify-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${OPMAAK[sleutel]}`}
    >
      {t.labels.automatisering[sleutel]}
    </span>
  );
}
