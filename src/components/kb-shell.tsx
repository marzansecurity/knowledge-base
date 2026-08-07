import { Sidebar } from '@/components/sidebar';

type Props = {
  naam?: string;
  rol?: string;
  children: React.ReactNode;
};

export function KbShell({ naam, rol, children }: Props) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Sidebar naam={naam} rol={rol} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
