import { expect, test } from '@playwright/test';

// Regression spec for ticket #14: the answer glow must render even with
// OS-level motion reduction (reducedMotion: 'reduce').
const LESSON = encodeURIComponent('A2+|vocabulary:feeling-good');

test.describe('feedback flash', () => {
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('wrong answer flashes the red edge glow with motion reduced', async ({ page }) => {
    await page.goto(`/A2+/game/play?lesson=${LESSON}`);
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: 'Запомнил, дальше' }).click();
    }
    const choice = page.locator('.test-main[data-correctindex]').first();
    await expect(choice).toBeVisible();
    const correct = Number(await choice.getAttribute('data-correctindex'));
    await choice.locator('.option-btn').nth(correct === 0 ? 1 : 0).click();
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    await expect(page.locator('.screen-feedback--error')).toBeAttached();
    await expect(page.locator('.app-shell--shake')).toHaveCount(1);
    await expect(page.locator('.game-heart--lost')).toHaveCount(1);
    // The overlay must hug the viewport, not the shaken content column: it is
    // portalled to document.body, so an ancestor transform cannot re-base it.
    const geometry = await page.evaluate(() => {
      const el = document.querySelector('.screen-feedback--error');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        inBody: el.parentElement === document.body,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    expect(geometry?.inBody).toBe(true);
    expect(geometry?.x).toBe(0);
    expect(geometry?.y).toBe(0);
    expect(geometry?.width).toBe(geometry?.viewportWidth);
    expect(geometry?.height).toBe(geometry?.viewportHeight);
    await page.screenshot({
      path: 'C:/Users/blood/AppData/Local/Temp/opencode/glow-reduced.png',
    });
  });
});
