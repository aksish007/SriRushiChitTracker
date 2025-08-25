'use client';

import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-gradient-to-r from-background to-muted/20 px-4 lg:h-[60px] lg:px-6 shadow-glow">
      <div className="flex-1">
        {/* Space for potential future content */}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <ThemeToggle />
        
        <div className="text-sm">
          <p className="font-medium text-primary">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
      </div>
    </header>
  );
}