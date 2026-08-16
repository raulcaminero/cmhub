'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/use-translation';

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function BackButton({ 
  fallbackHref = '/cmhub', 
  label, 
  showLabel = false, 
  className,
}: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push(fallbackHref as any);
    }
  }

  const backTitle = label || t('common.back') || 'Volver';

  if (showLabel) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className={cn('gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2 transition-colors', className)}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{backTitle}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleBack}
      title={backTitle}
      className={cn(
        'h-8 w-8 rounded-lg shrink-0 border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all shadow-2xs',
        className
      )}
    >
      <ArrowLeft className="w-4 h-4" />
    </Button>
  );
}
