import { expect, test } from '@playwright/test';

test.describe('flashcards', () => {
  test.beforeEach(async ({ page }) => {
    // First-visit behaviour: no saved settings, so all levels get selected.
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/flashcards');
    await expect(page.getByText(/К повторению:/)).toBeVisible();
  });

  test('answer block is covered before reveal and opens on demand', async ({ page }) => {
    // The answer takes its layout space while staying invisible — no jumps.
    await expect(page.locator('.flash-back--covered')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Показать ответ' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Хорошо', exact: true }),
    ).not.toBeVisible();

    await page.getByRole('button', { name: 'Показать ответ' }).click();

    await expect(page.locator('.flash-back--covered')).toHaveCount(0);
    await expect(page.locator('.flash-answer')).toBeVisible();
    for (const grade of ['Снова', 'Трудно', 'Хорошо', 'Легко']) {
      await expect(page.getByRole('button', { name: grade, exact: true })).toBeVisible();
    }
  });

  test('pronunciation buttons are present and safe to press', async ({ page }) => {
    // Headless Chromium may have no voices — the buttons must exist and a
    // press must not break the session (sound itself is not asserted).
    const speak = page.getByRole('button', { name: /Озвучить/ });
    await expect(speak.first()).toBeVisible();
    await speak.first().click();
    await expect(page.getByText(/К повторению:/)).toBeVisible();
    // Voice settings are always rendered, even with zero OS voices.
    await expect(page.getByLabel('Голос озвучки')).toBeVisible();
    await expect(page.getByText(/Как установить другие голоса/)).toBeVisible();
  });

  test('grading a card advances the queue', async ({ page }) => {
    // Fresh slots refill from the unseen pool, so the queue counters may stay
    // put — the visible proof is that the head card moves on.
    const front = page.locator('.flash-front');
    const before = await front.textContent();
    await page.getByRole('button', { name: 'Показать ответ' }).click();
    await page.getByRole('button', { name: 'Хорошо', exact: true }).click();
    await expect.poll(async () => front.textContent()).not.toBe(before);
  });

  test('scope footer shows the total deck size with per-type breakdown', async ({ page }) => {
    await expect(page.getByText(/Всего: \d+ карточ/)).toBeVisible();
    await expect(page.getByText(/слов: \d+ · фраз: \d+ · идиом: \d+/)).toBeVisible();
  });

  test('level entry preset selects only that level', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/flashcards?level=B1');
    await expect(page.getByRole('checkbox', { name: 'B1', exact: true })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'A2', exact: true })).not.toBeChecked();
  });

  test('level entry goes back to the level page', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/flashcards?level=B1');
    await page.getByRole('link', { name: 'К уровню' }).click();
    await expect(page).toHaveURL(/\/B1$/);
  });

  test('lesson entry shows a fixed deck with a back link to the lesson', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    const lesson = encodeURIComponent('A2|vocabulary:nice-to-meet-you');
    await page.goto(`/flashcards?lesson=${lesson}`);
    await expect(page.getByText('Подборка урока:')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Что повторяем' }),
    ).not.toBeVisible();
    await page.getByRole('link', { name: 'К списку' }).click();
    await expect(page).toHaveURL(/\/A2\/rules\//);
  });

  test('plain entry resets a stuck lesson filter', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    const lesson = encodeURIComponent('A2|vocabulary:nice-to-meet-you');
    await page.goto(`/flashcards?lesson=${lesson}`);
    await expect(page.getByText('Подборка урока:')).toBeVisible();
    await page.goto('/flashcards');
    await expect(page.getByRole('heading', { name: 'Что повторяем' })).toBeVisible();
  });
});
