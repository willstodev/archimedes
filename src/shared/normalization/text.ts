export function normalizeTextIdentity(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[\u{0300}-\u{036F}]/gu, "")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}
