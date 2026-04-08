// ── Base palette ──────────────────────────────────────
// Neutral colors that match the SCRIM logo identity (pure black/white)

export const LIGHT_COLORS = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  border: '#EBEBEB',
  borderStrong: '#D0D0D0',
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  // Neutral accent (used on auth screens before game selection)
  accent: '#000000',
  accentLight: 'rgba(0,0,0,0.06)',
  accentMid: 'rgba(0,0,0,0.19)',
  secondary: '#666666',
} as const;

export const DARK_COLORS = {
  background: '#000000',
  surface: '#111111',
  surfaceElevated: '#1A1A1A',
  border: '#1F1F1F',
  borderStrong: '#2E2E2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textTertiary: '#555555',
  // Neutral accent (used on auth screens before game selection)
  accent: '#FFFFFF',
  accentLight: 'rgba(255,255,255,0.06)',
  accentMid: 'rgba(255,255,255,0.19)',
  secondary: '#888888',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentLight: string;
  accentMid: string;
  secondary: string;
}

// ── Game accent overrides ────────────────────────────
// Only accent/secondary change per game — base palette stays the same

export const GAME_ACCENTS = {
  valorant: {
    id: 'valorant' as const,
    name: 'VALORANT',
    icon: 'V',
    logo: 'Valorant.png',
    disabled: false,
    accent: '#FF4655',
    accentLight: 'rgba(255,70,85,0.08)',
    accentMid: 'rgba(255,70,85,0.25)',
    secondary: '#00D4AA',
  },
  cs2: {
    id: 'cs2' as const,
    name: 'CS2',
    icon: 'CS',
    logo: 'Counter-Strike2.png',
    disabled: true,
    accent: '#DE9B35',
    accentLight: 'rgba(222,155,53,0.08)',
    accentMid: 'rgba(222,155,53,0.25)',
    secondary: '#5B9BD5',
  },
} as const;

export type GameId = keyof typeof GAME_ACCENTS;

// ── Game platform support ───────────────────────────
// true = game available on both PC and Console (not cross-platform)
// false = PC only
export const GAME_MULTIPLATFORM: Record<GameId, boolean> = {
  valorant: true,
  cs2: false,
};
