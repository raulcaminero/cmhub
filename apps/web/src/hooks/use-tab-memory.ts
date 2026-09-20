'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export function useTabMemory<T extends string>(
  defaultTab: T,
  validTabs: T[],
  storagePrefix = 'cmhub_tab_'
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const storageKey = `${storagePrefix}${pathname}`;
  const isSelfTriggeredRef = useRef(false);

  // Read initial tab from search params or sessionStorage
  const getInitialTab = (): T => {
    const urlTab = searchParams.get('tab') as T | null;
    if (urlTab && validTabs.includes(urlTab)) {
      return urlTab;
    }
    if (typeof window !== 'undefined') {
      try {
        const savedTab = sessionStorage.getItem(storageKey) as T | null;
        if (savedTab && validTabs.includes(savedTab)) {
          return savedTab;
        }
      } catch (e) {
        // Ignore sessionStorage errors
      }
    }
    return defaultTab;
  };

  const [activeTab, setActiveTabState] = useState<T>(getInitialTab);

  // Sync state when URL searchParams change
  useEffect(() => {
    if (isSelfTriggeredRef.current) {
      return;
    }
    const urlTab = searchParams.get('tab') as T | null;
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab);
      try {
        sessionStorage.setItem(storageKey, urlTab);
      } catch (e) {}
    }
  }, [searchParams, validTabs, activeTab, storageKey]);

  // Function to change tab without cluttering browser history
  const changeTab = useCallback(
    (newTab: T) => {
      if (!validTabs.includes(newTab) || newTab === activeTab) return;
      
      isSelfTriggeredRef.current = true;
      setActiveTabState(newTab);
      
      try {
        sessionStorage.setItem(storageKey, newTab);
      } catch (e) {}

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.set('tab', newTab);
        const newUrl = `${pathname}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });

        setTimeout(() => {
          isSelfTriggeredRef.current = false;
        }, 500);
      }
    },
    [validTabs, activeTab, storageKey, pathname, router]
  );

  return { activeTab, changeTab, setActiveTab: setActiveTabState };
}

export function getStoredTabForPath(path: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(`cmhub_tab_${path}`);
  } catch (e) {
    return null;
  }
}
