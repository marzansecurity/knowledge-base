import { Sidebar } from '@/components/sidebar';
import type { UserRole } from '@/lib/types';

type Props = {
  naam?: string;
  rol?: UserRole;
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
