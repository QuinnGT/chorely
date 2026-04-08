'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface StoreSubTab {
  key: string;
  label: string;
  icon: string;
  href: string;
}

const STORE_TABS: StoreSubTab[] = [
  { key: 'inventory', label: 'Inventory', icon: 'inventory_2', href: '/admin/store/inventory' },
  { key: 'orders', label: 'Orders', icon: 'receipt_long', href: '/admin/store/orders' },
  { key: 'settings', label: 'Settings', icon: 'tune', href: '/admin/store/settings' },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      {/* Store sub-tab pill bar */}
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '28px',
            color: 'var(--primary)',
            fontVariationSettings: '"FILL" 1',
          }}
        >
          storefront
        </span>
        <h2
          className="font-headline text-2xl font-bold"
          style={{ color: 'var(--on-surface)' }}
        >
          Store Admin
        </h2>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {STORE_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-semibold transition-all active:scale-95"
            style={{
              minHeight: '40px',
              color: pathname === tab.href ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
              background: pathname === tab.href ? 'var(--secondary-container)' : 'var(--surface-container-low)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '18px',
                fontVariationSettings: '"FILL" 1',
              }}
            >
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Store page content */}
      {children}
    </div>
  );
}
