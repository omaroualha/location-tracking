export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  brand: {
    primary: string;
    secondary: string;
    accent: string;
  };
  status: {
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    errorLight: string;
    info: string;
    infoLight: string;
  };
  priority: {
    critical: string;
    criticalBg: string;
    high: string;
    highBg: string;
    medium: string;
    mediumBg: string;
    low: string;
    lowBg: string;
  };
  ui: {
    border: string;
    borderLight: string;
    divider: string;
    overlay: string;
    card: string;
    cardHover: string;
  };
  gradients: {
    primary: readonly [string, string];
    success: readonly [string, string];
    warning: readonly [string, string];
    error: readonly [string, string];
    dark: readonly [string, string];
    glass: readonly [string, string];
  };
}

export interface ThemeStore {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}
