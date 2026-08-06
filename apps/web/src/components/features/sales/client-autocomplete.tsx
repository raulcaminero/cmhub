'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, UserCheck, Check, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Contact } from '@/services/contacts.api';

interface ClientAutocompleteProps {
  contacts: Contact[] | undefined;
  clientRnc: string;
  clientName: string;
  onSelect: (contact: { rnc: string; name: string }) => void;
  onRncChange: (rnc: string) => void;
  onNameChange: (name: string) => void;
}

export function ClientAutocomplete({
  contacts,
  clientRnc,
  clientName,
  onSelect,
  onRncChange,
  onNameChange,
}: ClientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(clientRnc || clientName || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search query with external values
  useEffect(() => {
    if (clientRnc || clientName) {
      setSearch(clientRnc ? `${clientRnc} - ${clientName}` : clientName);
    }
  }, [clientRnc, clientName]);

  // Filter clients by RNC or Name
  const clientList = contacts?.filter((c) => c.type === 'CLIENT' || c.type === 'BOTH') || [];
  const filtered = clientList.filter((c) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      c.rnc.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term)
    );
  });

  // Close popup on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectContact(contact: Contact) {
    onSelect({ rnc: contact.rnc, name: contact.name });
    setSearch(`${contact.rnc} - ${contact.name}`);
    setIsOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    setIsOpen(true);

    // Check if user entered a exact matching RNC
    const matched = clientList.find((c) => c.rnc === val || c.name === val);
    if (matched) {
      onSelect({ rnc: matched.rnc, name: matched.name });
    } else {
      // If user is typing manual RNC/name
      onRncChange(val);
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por RNC, Cédula o Nombre del Cliente..."
          value={search}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-4 text-xs h-10 shadow-2xs font-medium"
        />
      </div>

      {/* Autocomplete Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-64 overflow-y-auto rounded-lg border border-border bg-background dark:bg-slate-900 p-1.5 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95">
          {filtered.length > 0 ? (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Clientes Registrados ({filtered.length})
              </div>
              {filtered.map((c) => {
                const isSelected = c.rnc === clientRnc;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectContact(c)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-left rounded-md text-xs transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-xs text-foreground truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          RNC/Cédula: <span className="text-foreground font-medium">{c.rnc || 'Sin RNC'}</span>
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-4 px-3 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                No se encontraron clientes con "<span className="font-semibold text-foreground">{search}</span>"
              </p>
              <p className="text-[11px] text-muted-foreground">
                Puedes completar los campos de RNC y Nombre manualmente arriba.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
