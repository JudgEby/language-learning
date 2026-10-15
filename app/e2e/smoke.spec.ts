import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('home page lists levels and the flashcards entry', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Language Learning' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Карточки' })).toBeVisible();
    const levelLinks = page.getByRole('link', { name: /A2|B1|B2/ });
    await expect(levelLinks.first()).toBeVisible();
    expect(await levelLinks.count()).toBeGreaterThanOrEqual(5);
  });

  test('level page offers study, tests and flashcards', async ({ page }) => {
    await page.goto('/A2');
    await expect(page.getByRole('heading', { name: 'A2', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Изучать правила' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Проходить тесты' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Карточки' })).toBeVisible();
  });

  test('rules list opens a study page', async ({ page }) => {
    await page.goto('/A2/rules');
    await expect(page.getByRole('heading', { name: 'Обучение' })).toBeVisible();
    const firstItem = page.getByRole('listitem').first().getByRole('link');
    await expect(firstItem).toBeVisible();
    await firstItem.click();
    await expect(page.getByRole('button', { name: /пройденное/ })).toBeVisible();
  });

  test('tests list renders day sections', async ({ page }) => {
    await page.goto('/A2/tests');
    await expect(page.getByRole('heading', { name: 'День 1', exact: true })).toBeVisible();
  });

  test('flashcards page renders session, scope and settings', async ({ page }) => {
    await page.goto('/flashcards');
    await expect(page.getByRole('heading', { name: 'Карточки' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Что повторяем' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  });
});
