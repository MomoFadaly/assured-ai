'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Radar,
  HeartPulse,
  Activity,
  Settings,
  BookOpen,
  Bell,
  AlertOctagon,
  History,
  Layers,
  KeyRound,
  BellRing,
  TrendingUp,
  Building2,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    label: 'Admin',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
      { href: '/admin/packs', label: 'Vertical packs', icon: Layers },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/leads', label: 'Inbound leads', icon: Inbox },
      { href: '/admin/api-keys', label: 'API keys', icon: KeyRound },
      { href: '/admin/monitor', label: 'Site monitor', icon: Radar },
      { href: '/admin/notifications', label: 'Notifications', icon: BellRing },
      { href: '/admin/usage', label: 'Usage & cost', icon: TrendingUp },
      { href: '/admin/system', label: 'System', icon: HeartPulse },
      { href: '/admin/activity', label: 'Activity log', icon: History },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Operator surfaces',
    items: [
      { href: '/library', label: 'Source library', icon: BookOpen },
      { href: '/audit', label: 'Audit log', icon: Activity },
      { href: '/escalations', label: 'Escalations', icon: Bell },
      { href: '/voice', label: 'Voice profiles', icon: AlertOctagon },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin navigation" className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {section.label}
          </div>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors',
                      active
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
