export const VALORANT_REGIONS = [
  { id: 'NA',    label: 'North America' },
  { id: 'LATAM', label: 'Latin America' },
  { id: 'BR',    label: 'Brazil' },
  { id: 'EU',    label: 'Europe' },
  { id: 'KR',    label: 'Korea' },
  { id: 'APAC',  label: 'Asia-Pacific' },
] as const;

export type ValorantRegion = (typeof VALORANT_REGIONS)[number]['id'];

export const VALORANT_REGION_IDS: ValorantRegion[] =
  VALORANT_REGIONS.map((r) => r.id);

export function getRegionLabel(id: ValorantRegion): string {
  return VALORANT_REGIONS.find((r) => r.id === id)?.label ?? id;
}
