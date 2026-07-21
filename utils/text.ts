// Tronca un testo entro maxLength caratteri senza spezzare a meta' di una
// parola, aggiungendo "..." solo se il testo e' stato effettivamente accorciato.
export function truncateAtWordBoundary(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  const safeCut = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${safeCut.trim()}…`;
}
