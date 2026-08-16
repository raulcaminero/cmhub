'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'start' | 'end';
  delayMs?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayMs = 1500,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-1.5 text-[11px] leading-tight font-semibold text-blue-950 dark:text-blue-100 bg-blue-100/95 dark:bg-blue-900/95 border border-blue-300 dark:border-blue-700 rounded-lg shadow-lg whitespace-nowrap text-center pointer-events-none animate-in fade-in-0 zoom-in-95 backdrop-blur-xs',
            side === 'top' && [
              'bottom-full mb-2.5',
              align === 'center' && 'left-1/2 -translate-x-1/2',
              align === 'start' && 'left-0 translate-x-0',
              align === 'end' && 'right-0 translate-x-0',
            ],
            side === 'bottom' && [
              'top-full mt-2.5',
              align === 'center' && 'left-1/2 -translate-x-1/2',
              align === 'start' && 'left-0 translate-x-0',
              align === 'end' && 'right-0 translate-x-0',
            ],
            side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2.5',
            side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2.5',
            className
          )}
        >
          {content}

          {/* Speech Bubble Arrow Indicator (SVG sharp pointer) */}
          {side === 'top' && (
            <svg
              className={cn(
                'absolute top-full -mt-[1px]',
                align === 'center' && 'left-1/2 -translate-x-1/2',
                align === 'start' && 'left-4',
                align === 'end' && 'right-4'
              )}
              width="14"
              height="7"
              viewBox="0 0 14 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 0L7 7L14 0"
                className="fill-blue-100 dark:fill-blue-900 stroke-blue-300 dark:stroke-blue-700"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {side === 'bottom' && (
            <svg
              className={cn(
                'absolute bottom-full -mb-[1px]',
                align === 'center' && 'left-1/2 -translate-x-1/2',
                align === 'start' && 'left-4',
                align === 'end' && 'right-4'
              )}
              width="14"
              height="7"
              viewBox="0 0 14 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 7L7 0L14 7"
                className="fill-blue-100 dark:fill-blue-900 stroke-blue-300 dark:stroke-blue-700"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
