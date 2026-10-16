import { expect, test } from '@playwright/test';
import { passChoice, passIntro, passMatch, passSpelling } from './gameFlow';

const LESSON = encodeURIComponent('A2+|vocabulary:feeling-good');

test.describe('game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('intro advances to the next round', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
    await expect(page.getByLabel('Чекпоинт')).toBeVisible();
    await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    await expect(page.locator('.test-question').first()).toContainText('have a barbecue');
    await expect(page.getByLabel('Чекпоинт')).toHaveCount(0);
  });

  test('continue stays disabled until the round is answered', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    // Through the 4 intro cards to the first translation choice.
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    }
    const cont = page.getByRole('button', { name: 'Продолжить' });
    await expect(cont).toBeDisabled();
    await page.locator('.options .option-btn:not(:disabled)').first().click();
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    await expect(cont).toBeEnabled();
  });

  test('three mistakes burn hearts and end the session', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    }
    const choice = page.locator('.test-main[data-correctindex]');
    for (let m = 0; m < 3; m += 1) {
      const correct = Number(await choice.getAttribute('data-correctindex'));
      const options = choice.locator('.option-btn');
      const total = await options.count();
      await options.nth((correct + 1) % total).click();
      await page.getByRole('button', { name: 'Проверить', exact: true }).click();
      if (m < 2) await page.getByRole('button', { name: 'Продолжить' }).click();
    }
    await expect(page.getByText('Жизни закончились!')).toBeVisible();
    await expect(page.locator('.game-heart--lost')).toHaveCount(3);
    await page.getByRole('button', { name: 'Продолжить с блока' }).click();
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
    await expect(page.locator('.game-heart--lost')).toHaveCount(0);
    await expect(page.getByText(/Слов пройдено: [1-9]/)).toBeVisible();
  });

  test('level entry goes back to the lobby', async ({ page }) => {
    await page.goto('/A2+/game/play');
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
    await page.getByRole('link', { name: 'К игре' }).click();
    await expect(page).toHaveURL(/\/A2\+\/game$/);
    await expect(page.getByRole('heading', { name: 'Игра' })).toBeVisible();
  });

  test('lesson study page links into the game lobby', async ({ page }) => {
    const studyKey = encodeURIComponent('vocabulary:feeling-good');
    await page.goto(`/A2+/rules/${studyKey}`);
    await page.getByRole('button', { name: 'Игра', exact: true }).click();
    await expect(page).toHaveURL(/\/A2\+\/game\?lesson=/);
    await expect(page.getByRole('heading', { name: 'Игра' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Продолжить', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Начать с начала' }).click();
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
  });

  test('wrong assembled word costs a heart and clears the slots', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    }
    for (let i = 0; i < 4; i += 1) {
      const choice = page.locator('.test-main[data-correctindex]');
      const correct = Number(await choice.getAttribute('data-correctindex'));
      await choice.locator('.option-btn').nth(correct).click();
      await page.getByRole('button', { name: 'Проверить', exact: true }).click();
      await page.getByRole('button', { name: 'Продолжить' }).click();
    }
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
    const spelling = page.locator('.test-main[data-answer]');
    const answer = (await spelling.getAttribute('data-answer')) ?? '';
    for (const letter of [...answer].reverse()) {
      await spelling
        .locator(`button[data-letter="${letter}"][data-used="false"]`)
        .first()
        .click();
    }
    const check = spelling.getByRole('button', { name: 'Проверить' });
    await expect(check).toBeEnabled();
    await check.click();
    await expect(page.locator('.game-heart--lost')).toHaveCount(1);
    await expect(spelling.getByText(/Попробуйте ещё раз/)).toBeVisible();
    for (const letter of answer) {
      await spelling
        .locator(`button[data-letter="${letter}"][data-used="false"]`)
        .first()
        .click();
    }
    await spelling.getByRole('button', { name: 'Проверить' }).click();
    await expect(spelling.getByText(/Верно:/)).toBeVisible();
    await expect(page.locator('.game-heart--lost')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeEnabled();
  });

  test('lobby resumes the saved run where it stopped', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    await page.goto(`/A2+/game?lesson=${LESSON}`);
    await expect(page.getByText(/Пройдено \d+% · Потрачено жизней: 0/)).toBeVisible();
    const cont = page.getByRole('button', { name: 'Продолжить', exact: true });
    await expect(cont).toBeEnabled();
    await cont.click();
    await expect(page.locator('.test-question').first()).toContainText('go for a walk');
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
  });

  test('restart asks for confirm and wipes progress', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    await page.goto(`/A2+/game?lesson=${LESSON}`);
    await page.getByRole('button', { name: 'Начать с начала' }).click();
    await expect(page.getByText(/действительно хотите начать/)).toBeVisible();
    await page
      .locator('.modal-dialog')
      .getByRole('button', { name: 'Начать с начала', exact: true })
      .click();
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
    await page.goto(`/A2+/game?lesson=${LESSON}`);
    await expect(
      page.getByRole('button', { name: 'Продолжить', exact: true }),
    ).toBeDisabled();
  });

  test('reload keeps the run position', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    await page.reload();
    await expect(page.locator('.test-question').first()).toContainText('have a barbecue');
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();
  });

  test('fail in the second deal block resumes at round 1', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    // First deal block, all correct: intro, choice, match, spelling.
    await passIntro(page, 4);
    for (let i = 0; i < 4; i += 1) await passChoice(page, true);
    await passMatch(page);
    await passSpelling(page, 4);
    // Second deal block: intro, then three wrong choices burn the hearts.
    await passIntro(page, 4);
    await passChoice(page, false);
    await passChoice(page, false);
    const choice = page.locator('.test-main[data-correctindex]');
    const right = Number(await choice.getAttribute('data-correctindex'));
    const options = choice.locator('.option-btn');
    await options.nth((right + 1) % (await options.count())).click();
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    await expect(page.getByText('Жизни закончились!')).toBeVisible();
    await page.getByRole('button', { name: 'Продолжить с блока' }).click();
    // Checkpoint covers two deal blocks: back to checkpoint 1, not 2.
    await expect(page.getByText(/Чекпоинт 1 из 2/)).toBeVisible();
  });

  test('checkpoint arrival refills hearts', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    // Burn one heart on the very first choice, then play cleanly.
    await passIntro(page, 4);
    await passChoice(page, false);
    await expect(page.locator('.game-heart--lost')).toHaveCount(1);
    for (let i = 0; i < 3; i += 1) await passChoice(page, true);
    await passMatch(page);
    await passSpelling(page, 4);
    await passIntro(page, 4);
    for (let i = 0; i < 4; i += 1) await passChoice(page, true);
    await passMatch(page);
    await passSpelling(page, 4);
    // Second checkpoint: hearts are full again, but the span was not perfect.
    await expect(page.getByText(/Чекпоинт 2 из 2/)).toBeVisible();
    await expect(page.locator('.game-heart--lost')).toHaveCount(0);
    await expect(page.getByText(/Идеально: 0/)).toBeVisible();
  });

  test('clean checkpoint span counts as perfect', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    await passIntro(page, 4);
    for (let i = 0; i < 4; i += 1) await passChoice(page, true);
    await passMatch(page);
    await passSpelling(page, 4);
    await passIntro(page, 4);
    for (let i = 0; i < 4; i += 1) await passChoice(page, true);
    await passMatch(page);
    await passSpelling(page, 4);
    await expect(page.getByText(/Чекпоинт 2 из 2/)).toBeVisible();
    await expect(page.getByText(/Идеально: 1/)).toBeVisible();
  });

  test('full lesson session completes and persists progress', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    await expect(page.getByText(/Чекпоинт 1 из/)).toBeVisible();

    for (let step = 0; step < 250; step += 1) {
      if (await page.getByText('Сессия завершена!').isVisible()) break;

      const intro = page.getByRole('button', { name: 'Запомнил, дальше' });
      if (await intro.isVisible()) {
        await intro.click();
        continue;
      }

      if (await page.getByText('Соедините пары').isVisible()) {
        const enButtons = page.locator('button[data-side="en"]');
        const total = await enButtons.count();
        for (let k = 0; k < total; k += 1) {
          const button = enButtons.nth(k);
          if (await button.isDisabled()) continue;
          const cardId = await button.getAttribute('data-cardid');
          await button.click();
          await page
            .locator(`button[data-side="ru"][data-cardid="${cardId}"]`)
            .click();
        }
        await expect(page.getByText('Все пары собраны!')).toBeVisible();
        await page.getByRole('button', { name: 'Продолжить' }).click();
        continue;
      }

      const spelling = page.locator('.test-main[data-answer]');
      if (await spelling.isVisible()) {
        const answer = (await spelling.getAttribute('data-answer')) ?? '';
        for (const letter of answer) {
          await spelling
            .locator(`button[data-letter="${letter}"][data-used="false"]`)
            .first()
            .click();
        }
        await spelling.getByRole('button', { name: 'Проверить' }).click();
        await expect(spelling.getByText(/Верно:/)).toBeVisible();
        await page.getByRole('button', { name: 'Продолжить' }).click();
        continue;
      }

      const check = page.getByRole('button', { name: 'Проверить', exact: true });
      if (await check.isVisible()) {
        const choice = page.locator('.test-main[data-correctindex]');
        const correct = Number(await choice.getAttribute('data-correctindex'));
        await choice.locator('.option-btn').nth(correct).click();
        await check.click();
        await page.getByRole('button', { name: 'Продолжить' }).click();
        continue;
      }

      const cont = page.getByRole('button', { name: 'Продолжить' });
      if (await cont.isVisible()) {
        await cont.click();
      }
    }

    await expect(page.getByText('Сессия завершена!')).toBeVisible();
    await expect(page.getByText(/Идеально:/)).toBeVisible();

    const completed = await page.evaluate(() => {
      const raw = localStorage.getItem('language-learning-progress');
      if (!raw) return [];
      return (
        (JSON.parse(raw).state.levels['A2+']?.completedGame as string[]) ?? []
      );
    });
    expect(completed.length).toBeGreaterThan(0);
  });
});
