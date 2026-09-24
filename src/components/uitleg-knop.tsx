'use client';

import { useRef, type ReactNode } from 'react';
import { TaalLink } from '@/components/taal-link';

/**
 * Een ⓘ-knop die uitleg opent in een venster op dezelfde pagina, zodat de lezer
 * het overzicht niet hoeft te verlaten. De inhoud wordt op de server gerenderd
 * en als children meegegeven. "Lees het hele artikel" opent in een nieuw
 * tabblad, om dezelfde reden.
 */
export function UitlegKnop({
  titel,
  openLabel,
  sluitLabel,
  artikelHref,
  artikelLabel,
  children,
}: {
  titel: string;
  /** Toegankelijke naam van de knop, bv. "Uitleg: Tracking". */
  openLabel: string;
  sluitLabel: string;
  artikelHref: string | null;
  artikelLabel: string;
  children: ReactNode;
}) {
  const venster = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => venster.current?.showModal()}
        aria-label={openLabel}
        title={openLabel}
        className="inline-flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-navy-mid font-serif text-[12px] font-bold text-white italic normal-case shadow-sm transition-colors hover:bg-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
      >
        i
      </button>

      <dialog
        ref={venster}
        // Klik op de achtergrond (buiten het paneel) sluit het venster.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-32px)] max-w-[640px] rounded-xl border border-line p-0 text-left font-normal tracking-normal normal-case text-ink-soft shadow-xl backdrop:bg-[#10395b]/40"
      >
        <div className="flex max-h-[80vh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
            <h2 className="text-[17px] font-bold text-navy">{titel}</h2>
            <button
              type="button"
              onClick={() => venster.current?.close()}
              className="kb-btn px-2.5 py-1 text-[13px]"
            >
              {sluitLabel}
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-2">{children}</div>
          {artikelHref && (
            <div className="border-t border-line px-5 py-3 text-[13px]">
              <TaalLink
                href={artikelHref}
                target="_blank"
                className="font-semibold text-navy-mid hover:text-orange"
              >
                {artikelLabel} ↗
              </TaalLink>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
