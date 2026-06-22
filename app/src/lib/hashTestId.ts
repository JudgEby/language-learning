export async function hashTestId(
  question: string,
  options: string[],
  correctIndex: number,
): Promise<string> {
  const payload = `${question}|${options.join('|')}|${correctIndex}`;
  const data = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 12);
}

export function verifyTestId(
  question: TestFields,
  expectedId: string,
): Promise<boolean> {
  return hashTestId(question.question, question.options, question.correctIndex).then(
    (id) => id === expectedId,
  );
}

interface TestFields {
  question: string;
  options: string[];
  correctIndex: number;
}
