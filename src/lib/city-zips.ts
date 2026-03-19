/**
 * City → ZIP code mappings.
 * Used by REAPI search (multiple queries per ZIP) and BuyerProfile display.
 */
export const CITY_ZIPS: Record<string, string[]> = {
  'newton': ['02458', '02459', '02460', '02461', '02462', '02464', '02465', '02466', '02467', '02468'],
  'boston': ['02101', '02102', '02103', '02104', '02105', '02106', '02107', '02108', '02109', '02110', '02111', '02112', '02113', '02114', '02115', '02116', '02117', '02118', '02119', '02120', '02121', '02122', '02124', '02125', '02126', '02127', '02128', '02129', '02130', '02131', '02132', '02134', '02135', '02136'],
  'brookline': ['02445', '02446', '02447'],
  'cambridge': ['02138', '02139', '02140', '02141', '02142'],
  'somerville': ['02143', '02144', '02145'],
  'wellesley': ['02481', '02482'],
  'needham': ['02492', '02494'],
  'waltham': ['02451', '02452', '02453', '02454'],
  'watertown': ['02471', '02472'],
  'arlington': ['02474', '02476'],
  'lexington': ['02420', '02421'],
  'natick': ['01760', '01761'],
  'framingham': ['01701', '01702', '01703', '01704', '01705'],
  'concord': ['01742'],
  'sudbury': ['01776'],
  'wayland': ['01778'],
  'weston': ['02493'],
  'dover': ['02030'],
  'sherborn': ['01770'],
  'medfield': ['02052'],
  'westwood': ['02090'],
  'dedham': ['02026', '02027'],
  'milton': ['02186', '02187'],
  'quincy': ['02169', '02170', '02171'],
  'braintree': ['02184', '02185'],
  'hingham': ['02043'],
  'cohasset': ['02025'],
  'scituate': ['02066'],
  'duxbury': ['02332'],
  'marshfield': ['02050'],
  'plymouth': ['02360', '02361', '02362'],
}

export function getCityZips(city?: string): string[] {
  if (!city) return []
  const lower = city.toLowerCase().trim()

  // Exact match
  if (CITY_ZIPS[lower]) return CITY_ZIPS[lower]

  // Fuzzy: check if city starts with a known key (e.g. "Newton Lower Falls" → "newton")
  for (const [key, zips] of Object.entries(CITY_ZIPS)) {
    if (lower.startsWith(key) || key.startsWith(lower)) return zips
  }

  return []
}
