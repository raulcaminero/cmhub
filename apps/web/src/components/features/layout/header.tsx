'use client';

import { useState, useEffect, useRef } from 'react';
import { CompanySwitcher } from './company-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/auth.slice';
import { useRouter } from 'next/navigation';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/services/auth.api';
import { LogOut, User, X, Loader2 } from 'lucide-react';

export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: profile } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize form fields when profile data loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setEmail(profile.email);
    }
  }, [profile, modalOpen]);

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
    router.push('/login');
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const body: any = { firstName, lastName, email };
      if (password) body.password = password;

      await updateProfile(body).unwrap();
      setSuccessMessage('Perfil actualizado correctamente');
      setPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.data?.message || 'Error al actualizar el perfil.');
    }
  }

  const initials = profile 
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() 
    : 'U';

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0 relative z-30">
      <CompanySwitcher />

      {/* User profile section */}
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm hover:brightness-95 transition-all outline-none"
        >
          {initials}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-11 w-56 bg-card text-card-foreground border rounded-lg shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
            {profile && (
              <div className="px-4 py-2.5 border-b">
                <p className="text-sm font-semibold truncate">{profile.firstName} {profile.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
            )}
            <button
              onClick={() => {
                setDropdownOpen(false);
                setModalOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 hover:bg-muted transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              Ajustes de Perfil
            </button>
            <div className="border-t my-1"></div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 hover:bg-muted text-destructive hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground p-6 rounded-lg w-full max-w-md shadow-xl border relative">
            <button
              onClick={() => {
                setModalOpen(false);
                setErrorMessage('');
                setSuccessMessage('');
                setPassword('');
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-lg font-semibold mb-2">Ajustes de Perfil</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Edita tus datos personales y actualiza tu cuenta.
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="prof-name">Nombre</Label>
                  <Input
                    id="prof-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prof-lastname">Apellido</Label>
                  <Input
                    id="prof-lastname"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prof-email">Correo Electrónico</Label>
                <Input
                  id="prof-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prof-pass">Nueva Contraseña</Label>
                <Input
                  id="prof-pass"
                  type="password"
                  placeholder="Dejar en blanco para no cambiar"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
              </div>

              {successMessage && (
                <p className="text-xs text-green-600 font-medium">{successMessage}</p>
              )}
              {errorMessage && (
                <p className="text-xs text-destructive font-medium">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalOpen(false);
                    setErrorMessage('');
                    setSuccessMessage('');
                    setPassword('');
                  }}
                  disabled={isUpdating}
                >
                  Cerrar
                </Button>
                <Button type="submit" size="sm" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
