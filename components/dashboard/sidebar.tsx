'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
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
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
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
    title: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    title: 'Users',
    href: '/dashboard/users',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Pending Approvals',
    href: '/dashboard/pending-approvals',
    icon: Clock,
    adminOnly: true,
  },
  {
    title: 'Register User',
    href: '/dashboard/register',
    icon: UserPlus,
  },
  {
    title: 'Bulk Upload',
    href: '/dashboard/bulk-upload',
    icon: Upload,
    adminOnly: true,
  },
  {
    title: 'Chit Group Details',
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
    title: 'Referral Network',
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

function SidebarContent({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, logout, token } = useAuth();
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN' && token) {
      const fetchPendingCount = async () => {
        try {
          const response = await fetch('/api/users/pending-count', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setPendingCount(data.count);
          }
        } catch (error) {
          console.error('Error fetching pending count:', error);
        }
      };
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.role, token]);

  const filteredItems = sidebarItems.filter(
    item => !item.adminOnly || user?.role === 'ADMIN'
  );

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px] lg:px-6 bg-gradient-primary">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-white">
          <CreditCard className="h-6 w-6" />
          {!collapsed && <span>SRI RUSHI CHITS</span>}
        </Link>
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20 transition-all duration-300"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className="grid gap-2 p-4 lg:p-6">
          {filteredItems.map((item) => {
            const isPendingApprovals = item.href === '/dashboard/pending-approvals';
            const showBadge = isPendingApprovals && pendingCount !== null && pendingCount > 0;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-2 transition-all duration-300 relative',
                    collapsed ? 'px-2' : 'px-4',
                    pathname === item.href 
                      ? 'bg-gradient-primary text-white shadow-glow hover:scale-105' 
                      : 'hover:bg-primary/10 hover:text-primary hover:shadow-md'
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span>{item.title}</span>
                      {showBadge && (
                        <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && showBadge && (
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 py-0 min-w-[1.25rem] h-5 flex items-center justify-center">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      
      <div className="border-t p-4 bg-gradient-to-t from-muted/20 to-transparent">
        {!collapsed && (
          <div className="mb-3 text-sm">
            <p className="font-medium text-primary">{user?.firstName} {user?.lastName}</p>
            <p className="text-muted-foreground">{user?.registrationId}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
        )}
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 hover:bg-gradient-danger hover:text-white hover:border-red-500 transition-all duration-300",
            collapsed ? "px-2" : "px-4"
          )}
          onClick={logout}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden hover:bg-gradient-primary hover:text-white hover:border-primary transition-all duration-300"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <SidebarContent collapsed={false} onToggle={() => {}} />
        </SheetContent>
      </Sheet>
      
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <div className={cn(
          "border-r bg-gradient-to-b from-background to-muted/20 shadow-glow transition-all duration-300",
          collapsed ? "w-16" : "w-[280px]"
        )}>
          <SidebarContent collapsed={collapsed} onToggle={handleToggle} />
        </div>
      </div>
    </>
  );
}