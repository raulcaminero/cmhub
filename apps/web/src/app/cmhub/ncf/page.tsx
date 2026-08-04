'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NcfPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cmhub/settings?tab=ncf');
  }, [router]);

  return null;
}
