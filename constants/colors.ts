export const COLORS = {
  primary: '#D4AF37',
  background: '#0B0B0B',
  card: '#161616',
  textPrimary: '#F4EFE0',
  textSecondary: '#A39A85',
  textOnPrimary: '#0B0B0B',
  surface: '#242220',
  border: '#3A342A',
  shadow: '#000000',
  warning: '#E0A030',
  success: '#D4AF37',
  danger: '#E5534B',
} as const;

// Metallic gold: dark edge -> bright highlight -> warm mid -> dark edge.
export const GOLD_GRADIENT = ['#A87E1C', '#F3DB82', '#FFF4BF', '#E2BB45', '#A87E1C'] as const;
export const GOLD_LOCATIONS = [0, 0.3, 0.5, 0.75, 1] as const;
export const GOLD_EDGE = '#F3DB82';
