import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useThemeMode } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, FireOneColors } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ThemeToggle() {
  const { theme, isDark } = useTheme();
  const { setThemeMode } = useThemeMode();
  const scale = useSharedValue(1);

  const toggleTheme = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setThemeMode(isDark ? "light" : "dark");
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={toggleTheme}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        { backgroundColor: theme.backgroundSecondary },
        animatedStyle,
      ]}
    >
      <Feather
        name={isDark ? "sun" : "moon"}
        size={18}
        color={isDark ? FireOneColors.orange : theme.textSecondary}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
