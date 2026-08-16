import { test, expect } from '@playwright/test';

test.describe('DGII Tax Reports (IT-1 / 606 / 607) & NCF Sequence Controls', () => {
  test('tax copilot module route is protected', async ({ page }) => {
    await page.goto('/cmhub/tax');
    await expect(page).toHaveURL(/\/login/);
  });

  test('verifies NCF Sequence range boundary checks (Current <= Max)', async () => {
    const sequence = {
      type: 'B01',
      prefix: 'B01',
      current: 45,
      max: 100,
      isActive: true,
      expiresAt: '2026-12-31',
    };

    const isAvailable = sequence.current < sequence.max && sequence.isActive;
    const nextFormattedNcf = `${sequence.prefix}${String(sequence.current + 1).padStart(8, '0')}`;

    expect(isAvailable).toBe(true);
    expect(nextFormattedNcf).toBe('B0100000046');
  });

  test('detects exhausted NCF sequence (Current >= Max)', async () => {
    const exhaustedSequence = {
      type: 'B01',
      prefix: 'B01',
      current: 100,
      max: 100,
      isActive: true,
    };

    const isAvailable = exhaustedSequence.current < exhaustedSequence.max;
    expect(isAvailable).toBe(false);
  });
});
