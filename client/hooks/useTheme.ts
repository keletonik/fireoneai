import { Colors } from "@/constants/theme";
import { useThemeMode } from "@/contexts/ThemeContext";

export function useTheme() {
  const { isDark } = useThemeMode();
  const theme = Colors[isDark ? "dark" : "light"];

  return {
    theme,
    isDark,
  };
}
