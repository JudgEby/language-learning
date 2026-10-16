import type { Page } from '@playwright/test';

/** Shared solvers for the game e2e flows (always answer to advance). */
export async function passIntro(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
  }
}

export async function passChoice(page: Page, correct: boolean): Promise<void> {
  const choice = page.locator('.test-main[data-correctindex]');
  const right = Number(await choice.getAttribute('data-correctindex'));
  const options = choice.locator('.option-btn');
  const total = await options.count();
  await options.nth(correct ? right : (right + 1) % total).click();
  await page.getByRole('button', { name: 'Проверить', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
}

export async function passMatch(page: Page): Promise<void> {
  const enButtons = page.locator('button[data-side="en"]');
  const total = await enButtons.count();
  for (let k = 0; k < total; k += 1) {
    const button = enButtons.nth(k);
    if (await button.isDisabled()) continue;
    const cardId = await button.getAttribute('data-cardid');
    await button.click();
    await page.locator(`button[data-side="ru"][data-cardid="${cardId}"]`).click();
  }
  await page.getByRole('button', { name: 'Продолжить' }).click();
}

export async function passSpelling(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    const spelling = page.locator('.test-main[data-answer]');
    const answer = (await spelling.getAttribute('data-answer')) ?? '';
    for (const letter of answer) {
      await spelling
        .locator(`button[data-letter="${letter}"][data-used="false"]`)
        .first()
        .click();
    }
    await spelling.getByRole('button', { name: 'Проверить' }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();
  }
}
