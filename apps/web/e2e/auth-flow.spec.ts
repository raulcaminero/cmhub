import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation Flow', () => {
  test('redirects unauthenticated user from protected route /cmhub to /login', async ({ page }) => {
    await page.goto('/cmhub');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders branding, inputs, and submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión|login|ingresar/i })).toBeVisible();
  });

  test('registration page renders registration form and elements', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
