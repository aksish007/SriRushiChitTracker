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

interface Subscription {
  id: string;
  subscriberId: string;
  status: string;
  user: {
    firstName: string;
    lastName: string;
    registrationId: string;
  };
  chitScheme: {
    chitId: string;
    name: string;
    amount: number;
    duration: number;
  };
}

interface SearchableSubscriptionSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onSubscriptionSelect?: (subscription: Subscription) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  activeOnly?: boolean;
}

export function SearchableSubscriptionSelector({
  value,
  onValueChange,
  onSubscriptionSelect,
  placeholder = "Choose a subscription",
  className,
  disabled = false,
  error = false,
  activeOnly = false,
}: SearchableSubscriptionSelectorProps) {
  const { token } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedSubscription, setSelectedSubscription] = React.useState<Subscription | null>(null);

  // Debounced search function
  const searchSubscriptions = React.useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setSubscriptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/subscriptions?search=${encodeURIComponent(query)}&limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          let filteredSubscriptions = data.subscriptions;
          
          if (activeOnly) {
            filteredSubscriptions = filteredSubscriptions.filter((sub: Subscription) => sub.status === 'ACTIVE');
          }
          
          setSubscriptions(filteredSubscriptions);
        }
      } catch (error) {
        console.error('Error searching subscriptions:', error);
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    },
    [token, activeOnly]
  );

  // Debounce search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSubscriptions(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchSubscriptions]);

  // Find selected subscription when value changes
  React.useEffect(() => {
    if (value && subscriptions.length > 0) {
      const subscription = subscriptions.find(s => s.id === value);
      setSelectedSubscription(subscription || null);
    } else {
      setSelectedSubscription(null);
    }
  }, [value, subscriptions]);

  const handleSelect = (subscriptionId: string) => {
    onValueChange?.(subscriptionId);
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    setSelectedSubscription(subscription || null);
    if (subscription && onSubscriptionSelect) {
      onSubscriptionSelect(subscription);
    }
    setOpen(false);
  };

  const displayValue = selectedSubscription 
    ? `${selectedSubscription.subscriberId} - ${selectedSubscription.user.firstName} ${selectedSubscription.user.lastName} (${selectedSubscription.chitScheme.chitId})`
    : placeholder;

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
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by subscriber ID, user name, or chit ID..."
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
                "No subscriptions found"
              )}
            </CommandEmpty>
            <CommandGroup>
              {subscriptions.map((subscription) => (
                <CommandItem
                  key={subscription.id}
                  value={subscription.id}
                  onSelect={() => handleSelect(subscription.id)}
                >
                  <Check 
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === subscription.id ? "opacity-100" : "opacity-0"
                    )} 
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {subscription.subscriberId} - {subscription.user.firstName} {subscription.user.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {subscription.chitScheme.chitId} - {subscription.chitScheme.name} (₹{subscription.chitScheme.amount.toLocaleString()}, {subscription.chitScheme.duration} months)
                      <span className={cn(
                        "ml-2 px-2 py-0.5 rounded text-xs",
                        subscription.status === 'ACTIVE' ? "bg-green-100 text-green-800" :
                        subscription.status === 'COMPLETED' ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {subscription.status}
                      </span>
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
