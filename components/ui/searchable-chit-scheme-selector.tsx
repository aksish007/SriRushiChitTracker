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

interface ChitScheme {
  id: string;
  chitId: string;
  name: string;
  amount: number;
  duration: number;
  isActive: boolean;
}

interface SearchableChitSchemeSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  activeOnly?: boolean;
}

export function SearchableChitSchemeSelector({
  value,
  onValueChange,
  placeholder = "Select a chit scheme",
  className,
  disabled = false,
  error = false,
  activeOnly = false,
}: SearchableChitSchemeSelectorProps) {
  const { token } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [allSchemes, setAllSchemes] = React.useState<ChitScheme[]>([]);
  const [filteredSchemes, setFilteredSchemes] = React.useState<ChitScheme[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedScheme, setSelectedScheme] = React.useState<ChitScheme | null>(null);

  // Load all chit schemes on component mount
  const loadAllSchemes = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chit-schemes?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        let schemes = data.schemes;
        
        if (activeOnly) {
          schemes = schemes.filter((scheme: ChitScheme) => scheme.isActive);
        }
        
        setAllSchemes(schemes);
        setFilteredSchemes(schemes);
      }
    } catch (error) {
      console.error('Error loading chit schemes:', error);
      setAllSchemes([]);
      setFilteredSchemes([]);
    } finally {
      setLoading(false);
    }
  }, [token, activeOnly]);

  // Load schemes on mount
  React.useEffect(() => {
    loadAllSchemes();
  }, [loadAllSchemes]);

  // Filter schemes based on search query
  React.useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setFilteredSchemes(allSchemes);
    } else {
      const filtered = allSchemes.filter(scheme =>
        scheme.chitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSchemes(filtered);
    }
  }, [searchQuery, allSchemes]);

  // Find selected scheme when value changes
  React.useEffect(() => {
    if (value && allSchemes.length > 0) {
      const scheme = allSchemes.find(s => s.id === value);
      setSelectedScheme(scheme || null);
    } else {
      setSelectedScheme(null);
    }
  }, [value, allSchemes]);

  const handleSelect = (schemeId: string) => {
    onValueChange?.(schemeId);
    const scheme = allSchemes.find(s => s.id === schemeId);
    setSelectedScheme(scheme || null);
    setOpen(false);
  };

  const displayValue = selectedScheme 
    ? `${selectedScheme.chitId} - ${selectedScheme.name} (₹${Number(selectedScheme.amount).toLocaleString()})`
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
            placeholder="Search by chit ID or scheme name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : filteredSchemes.length === 0 ? (
                "No chit schemes found"
              ) : (
                "Type to search chit schemes"
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredSchemes.map((scheme) => (
                <CommandItem
                  key={scheme.id}
                  value={scheme.id}
                  onSelect={() => handleSelect(scheme.id)}
                >
                  <Check 
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === scheme.id ? "opacity-100" : "opacity-0"
                    )} 
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {scheme.chitId} - {scheme.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ₹{Number(scheme.amount).toLocaleString()} • {scheme.duration} months
                      {!scheme.isActive && <span className="text-red-500 ml-2">(Inactive)</span>}
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
