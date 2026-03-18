export const GAME_THEMES = {
  valorant: {
    id: 'valorant',
    name: 'VALORANT',
    icon: 'V',
    colors: {
      accent: '#FF4655',
      accentLight: '#FF465518',
      accentMid: '#FF465540',
      secondary: '#00D4AA',
      background: '#0F1923',
      surface: '#1A2634',
      surfaceBorder: '#2A3A4A',
      textPrimary: '#ECE8E1',
      textSecondary: '#768A96',
    },
  },
  cs2: {
    id: 'cs2',
    name: 'CS2',
    icon: 'CS',
    colors: {
      accent: '#DE9B35',
      accentLight: '#DE9B3518',
      accentMid: '#DE9B3540',
      secondary: '#5B9BD5',
      background: '#1B1E23',
      surface: '#252930',
      surfaceBorder: '#353A42',
      textPrimary: '#E8E6E0',
      textSecondary: '#7A7D82',
    },
  },
} as const;

export type GameId = keyof typeof GAME_THEMES;
