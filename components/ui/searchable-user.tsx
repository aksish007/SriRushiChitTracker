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

  // Fetch user by ID when value is set but not found in search results
  React.useEffect(() => {
    const fetchUserById = async () => {
      if (!value || value === noOptionValue || !token) {
        setSelectedUser(null);
        return;
      }

      // Check if user is already in the users array
      const foundUser = users.find(u => u.id === value);
      if (foundUser) {
        setSelectedUser(foundUser);
        return;
      }

      // If not found, try to fetch by ID
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${value}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            const user: User = {
              id: data.user.id,
              registrationId: data.user.registrationId,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              email: data.user.email,
              referrals: data.user.referrals,
            };
            setSelectedUser(user);
            // Also add to users array so it's available for display
            setUsers(prev => {
              const exists = prev.find(u => u.id === user.id);
              return exists ? prev : [...prev, user];
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user by ID:', error);
        setSelectedUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserById();
  }, [value, noOptionValue, token, users]);

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
