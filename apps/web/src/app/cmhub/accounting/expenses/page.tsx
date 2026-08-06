'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExpensesPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cmhub/accounting?tab=expenses' as any);
  }, [router]);

  return null;
}
