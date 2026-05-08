export function compactPdaLabel(label: string) {
  return label
    .replace(/\s*->\s*/g, " \u2192 ")
    .replace(/\beps\b/g, "\u03B5")
    .replace(/,\s+/g, ", ");
}
