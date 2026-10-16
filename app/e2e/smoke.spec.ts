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
    await expect(page.getByRole('link', { name: 'Играть' })).toBeVisible();
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

  test('settings page holds theme and voice with a back link', async ({ page }) => {
    await page.goto('/settings?from=%2FA2');
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Тема' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Тёмная тема' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Озвучка' })).toBeVisible();
    await expect(page.getByLabel('Голос озвучки')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Назад' })).toBeVisible();
  });

  test('settings gear carries the current page and returns to it', async ({ page }) => {
    await page.goto('/A2');
    await page.getByRole('link', { name: 'Настройки' }).click();
    await expect(page).toHaveURL(/\/settings\?from=%2FA2/);
    await page.getByRole('link', { name: 'Назад' }).click();
    await expect(page).toHaveURL('/A2');
  });

  test('settings voice select fits the card on mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/settings?from=%2F');
    const card = page.locator('.settings-section', {
      has: page.getByLabel('Голос озвучки'),
    });
    const cardBox = await card.boundingBox();
    const selectBox = await page.getByLabel('Голос озвучки').boundingBox();
    expect(cardBox).not.toBeNull();
    expect(selectBox).not.toBeNull();
    expect(selectBox!.x + selectBox!.width).toBeLessThanOrEqual(
      cardBox!.x + cardBox!.width + 1,
    );
  });

  test('game lobby renders continue and restart', async ({ page }) => {
    await page.goto('/A2/game');
    await expect(page.getByRole('heading', { name: 'Игра' })).toBeVisible();
    const cont = page.getByRole('button', { name: 'Продолжить', exact: true });
    await expect(cont).toBeDisabled();
    // A disabled lobby button must look inactive, not like a live one.
    await expect(cont).toHaveCSS('opacity', '0.6');
    await expect(page.getByRole('button', { name: 'Начать с начала' })).toBeVisible();
  });

  test('game page renders the first round', async ({ page }) => {
    await page.goto('/A2/game/play');
    await expect(page.getByRole('heading', { name: 'Игра' })).toBeVisible();
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
  });
});
