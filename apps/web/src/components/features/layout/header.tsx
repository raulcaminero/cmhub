'use client';

import { CompanySwitcher } from './company-switcher';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/auth.slice';
import { useRouter } from 'next/navigation';

export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  function handleLogout() {
    dispatch(logout());
    router.push('/login');
  }

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
      <CompanySwitcher />
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" />
        Salir
      </Button>
    </header>
  );
}
