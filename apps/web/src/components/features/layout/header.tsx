'use client';

import { useState, useEffect, useRef } from 'react';
import { CompanySwitcher } from './company-switcher';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/auth.slice';
import { useRouter } from 'next/navigation';
import { useGetProfileQuery } from '@/services/auth.api';
import { LogOut, User, Settings, Shield, Palette } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: profile } = useGetProfileQuery();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    dispatch(logout());
    router.push('/login' as any);
  }

  function navigateTo(tab: string) {
    setDropdownOpen(false);
    router.push(`/cmhub/settings?tab=${tab}` as any);
  }

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : 'U';

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0 relative z-30">
      <CompanySwitcher />

      {/* User profile section */}
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        <ThemeToggle />

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm hover:brightness-95 transition-all outline-none ring-2 ring-primary/20"
        >
          {initials}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-11 w-60 bg-card text-card-foreground border rounded-xl shadow-xl py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* User info header */}
            {profile && (
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{profile.firstName} {profile.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation items */}
            <div className="py-1">
              <button
                onClick={() => navigateTo('profile')}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted transition-colors rounded-md mx-0"
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm leading-tight">Mi Perfil</p>
                  <p className="text-[10px] text-muted-foreground">Nombre, correo y datos</p>
                </div>
              </button>

              <button
                onClick={() => navigateTo('preferences')}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted transition-colors rounded-md mx-0"
              >
                <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Palette className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm leading-tight">Preferencias</p>
                  <p className="text-[10px] text-muted-foreground">Tema e idioma</p>
                </div>
              </button>

              <button
                onClick={() => navigateTo('security')}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted transition-colors rounded-md mx-0"
              >
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm leading-tight">Seguridad</p>
                  <p className="text-[10px] text-muted-foreground">Cambiar contraseña</p>
                </div>
              </button>

              <button
                onClick={() => navigateTo('company')}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted transition-colors rounded-md mx-0"
              >
                <div className="w-7 h-7 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Settings className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-sm leading-tight">Configuraciones</p>
                  <p className="text-[10px] text-muted-foreground">Empresa y equipo</p>
                </div>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-destructive/10 text-destructive hover:text-destructive transition-colors rounded-md"
              >
                <div className="w-7 h-7 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <p className="font-medium">Cerrar sesión</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
