export type ThemeMode = "light" | "dark";

export interface ThemeState {
  mode: ThemeMode;
  mounted: boolean;
  toggleTheme: () => void;
  initializeTheme: () => void;
}
