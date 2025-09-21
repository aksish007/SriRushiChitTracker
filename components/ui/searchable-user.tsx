'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth-context';

interface User {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  referrals?: Array<{ id: string }>;
}

interface SearchableUserProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  showNoOption?: boolean;
  noOptionLabel?: string;
  noOptionValue?: string;
  showReferralCount?: boolean;
  showEmail?: boolean;
}

export function SearchableUser({
  value,
  onValueChange,
  placeholder = "Select a user",
  className,
  disabled = false,
  error = false,
  showNoOption = false,
  noOptionLabel = "Sri Rushi Chits",
  noOptionValue = "none",
  showReferralCount = false,
  showEmail = false,
}: SearchableUserProps) {
  const { token } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Debounced search function
  const searchUsers = React.useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Debounce search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  // Find selected user when value changes
  React.useEffect(() => {
    if (value && value !== noOptionValue && users.length > 0) {
      const user = users.find(u => u.id === value);
      setSelectedUser(user || null);
    } else {
      setSelectedUser(null);
    }
  }, [value, users, noOptionValue]);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === noOptionValue) {
      onValueChange?.(noOptionValue);
      setSelectedUser(null);
    } else {
      onValueChange?.(selectedValue);
      const user = users.find(u => u.id === selectedValue);
      setSelectedUser(user || null);
    }
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (value === noOptionValue) {
      return noOptionLabel;
    }
    
    if (selectedUser) {
      let display = `${selectedUser.registrationId} - ${selectedUser.firstName} ${selectedUser.lastName}`;
      
      if (showReferralCount && selectedUser.referrals) {
        display += ` (${selectedUser.referrals.length}/3 referrals)`;
      }
      
      return display;
    }
    
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-red-500",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{getDisplayValue()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by registration ID, first name, or last name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </div>
              ) : searchQuery.length < 2 ? (
                "Type at least 2 characters to search"
              ) : (
                "No users found"
              )}
            </CommandEmpty>
            <CommandGroup>
              {showNoOption && (
                <CommandItem
                  value={noOptionValue}
                  onSelect={() => handleSelect(noOptionValue)}
                >
                  <Check 
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === noOptionValue ? "opacity-100" : "opacity-0"
                    )} 
                  />
                  {noOptionLabel}
                </CommandItem>
              )}
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => handleSelect(user.id)}
                >
                  <Check 
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0"
                    )} 
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user.registrationId} - {user.firstName} {user.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {showReferralCount && user.referrals && `${user.referrals.length}/3 referrals`}
                      {showEmail && user.email && (showReferralCount ? ` • ${user.email}` : user.email)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
