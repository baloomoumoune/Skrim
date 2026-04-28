import type { ValorantRegion } from './valorant-regions';

export type ValorantServer = {
  id: string;
  region: ValorantRegion;
  displayName: string;
  sortOrder: number;
};

export const VALORANT_SERVERS: ValorantServer[] = [
  { id: 'na-virginia',    region: 'NA',    displayName: 'Virginia',   sortOrder: 10 },
  { id: 'na-illinois',    region: 'NA',    displayName: 'Illinois',   sortOrder: 20 },
  { id: 'na-texas',       region: 'NA',    displayName: 'Texas',      sortOrder: 30 },
  { id: 'na-oregon',      region: 'NA',    displayName: 'Oregon',     sortOrder: 40 },
  { id: 'na-california',  region: 'NA',    displayName: 'California', sortOrder: 50 },
  { id: 'latam-mexico',   region: 'LATAM', displayName: 'Mexico',     sortOrder: 10 },
  { id: 'latam-chile',    region: 'LATAM', displayName: 'Chile',      sortOrder: 20 },
  { id: 'br-saopaulo',    region: 'BR',    displayName: 'São Paulo',  sortOrder: 10 },
  { id: 'eu-paris',       region: 'EU',    displayName: 'Paris',      sortOrder: 10 },
  { id: 'eu-frankfurt',   region: 'EU',    displayName: 'Frankfurt',  sortOrder: 20 },
  { id: 'eu-stockholm',   region: 'EU',    displayName: 'Stockholm',  sortOrder: 30 },
  { id: 'eu-london',      region: 'EU',    displayName: 'London',     sortOrder: 40 },
  { id: 'eu-madrid',      region: 'EU',    displayName: 'Madrid',     sortOrder: 50 },
  { id: 'eu-warsaw',      region: 'EU',    displayName: 'Warsaw',     sortOrder: 60 },
  { id: 'eu-istanbul',    region: 'EU',    displayName: 'Istanbul',   sortOrder: 70 },
  { id: 'eu-bahrain',     region: 'EU',    displayName: 'Bahrain',    sortOrder: 80 },
  { id: 'kr-seoul',       region: 'KR',    displayName: 'Seoul',      sortOrder: 10 },
  { id: 'apac-tokyo',     region: 'APAC',  displayName: 'Tokyo',      sortOrder: 10 },
  { id: 'apac-singapore', region: 'APAC',  displayName: 'Singapore',  sortOrder: 20 },
  { id: 'apac-hongkong',  region: 'APAC',  displayName: 'Hong Kong',  sortOrder: 30 },
  { id: 'apac-sydney',    region: 'APAC',  displayName: 'Sydney',     sortOrder: 40 },
  { id: 'apac-mumbai',    region: 'APAC',  displayName: 'Mumbai',     sortOrder: 50 },
  { id: 'apac-jakarta',   region: 'APAC',  displayName: 'Jakarta',    sortOrder: 60 },
  { id: 'apac-taipei',    region: 'APAC',  displayName: 'Taipei',     sortOrder: 70 },
];

export function serversInRegion(region: ValorantRegion): ValorantServer[] {
  return VALORANT_SERVERS
    .filter((s) => s.region === region)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getServerById(id: string): ValorantServer | undefined {
  return VALORANT_SERVERS.find((s) => s.id === id);
}
