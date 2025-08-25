'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  FileText,
  PieChart,
  UserPlus,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/dashboard/users',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Register User',
    href: '/dashboard/register',
    icon: UserPlus,
    adminOnly: true,
  },
  {
    title: 'Bulk Upload',
    href: '/dashboard/bulk-upload',
    icon: Upload,
    adminOnly: true,
  },
  {
    title: 'Chit Schemes',
    href: '/dashboard/chit-schemes',
    icon: CreditCard,
  },
  {
    title: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: TrendingUp,
  },
  {
    title: 'Payouts',
    href: '/dashboard/payouts',
    icon: FileText,
  },
  {
    title: 'Referral Tree',
    href: '/dashboard/referral-tree',
    icon: PieChart,
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: FileText,
    adminOnly: true,
  },
];

function SidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = sidebarItems.filter(
    item => !item.adminOnly || user?.role === 'ADMIN'
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <CreditCard className="h-6 w-6" />
          <span>SRI RUSHI CHITS</span>
        </Link>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className="grid gap-2 p-4 lg:p-6">
          {filteredItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-2',
                  pathname === item.href && 'bg-primary/10 text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      
      <div className="border-t p-4">
        <div className="mb-3 text-sm">
          <p className="font-medium">{user?.firstName} {user?.lastName}</p>
          <p className="text-muted-foreground">{user?.registrationId}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      
      {/* Desktop sidebar */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full w-[280px] flex-col">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}