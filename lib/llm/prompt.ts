/**
 * Turns a raw keyword into a recommendation-eliciting question, so the scan reliably
 * measures "does this brand get recommended for this topic" regardless of how the keyword
 * is phrased. A bare keyword like "CRM software" often won't make a model list brands;
 * this framing does.
 */
export function buildScanPrompt(keyword: string): string {
  const k = (keyword || '').trim();
  return (
    `A user is looking for recommendations about: "${k}".\n\n` +
    `Recommend the best real, specific brands, products, companies, or tools for this. ` +
    `List them by name (most recommended first) and briefly say why. ` +
    `Only include options that genuinely exist.`
  );
}
