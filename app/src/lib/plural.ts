/**
 * Russian noun agreement by count.
 *
 * `one` for 1, 11, 21…; `few` for 2-4, 12-14…; `many` otherwise (including 0).
 * Use `n` to interpolate the number itself.
 */
export function plural(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = Math.abs(n) % 10;

  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** "36 уроков" / "1 урок" / "2 урока". */
export function lessons(count: number): string {
  return `${count} ${plural(count, 'урок', 'урока', 'уроков')}`;
}

/** "30 дней тестов" / "1 день тестов" / "2 дня тестов". */
export function testDays(count: number): string {
  return `${count} ${plural(count, 'день тестов', 'дня тестов', 'дней тестов')}`;
}
