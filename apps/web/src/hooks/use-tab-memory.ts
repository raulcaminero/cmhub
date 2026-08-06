'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';

export function useTabMemory<T extends string>(
  defaultTab: T,
  validTabs: T[],
  storagePrefix = 'cmhub_tab_'
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = `${storagePrefix}${pathname}`;

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
      setActiveTabState(newTab);
      try {
        sessionStorage.setItem(storageKey, newTab);
      } catch (e) {}

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', newTab);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    },
    [validTabs, activeTab, storageKey]
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
