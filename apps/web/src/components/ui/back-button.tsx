'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/use-translation';

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
}

export function BackButton({ fallbackHref = '/cmhub', label, className }: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push(fallbackHref as any);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn('gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2 -ml-1 transition-colors', className)}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label || t('common.back') || 'Volver'}</span>
    </Button>
  );
}
