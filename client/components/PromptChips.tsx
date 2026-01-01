import React from "react";
import { View, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors } from "@/constants/theme";

interface PromptChipsProps {
  onSelect: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    label: "AFSS Requirements",
    prompt: "What is required for an AFSS in NSW?",
    icon: "file-text" as const,
  },
  {
    label: "Class 2 Measures",
    prompt: "What essential measures apply to a Class 2 building?",
    icon: "home" as const,
  },
  {
    label: "FRL Specifications",
    prompt: "What FRL is required for a non-load-bearing internal wall between a car park and an exit stair in an NCC Class 2 building?",
    icon: "layers" as const,
  },
  {
    label: "Stair Pressurisation",
    prompt: "How do I approach tenability calculations for stair pressurisation within the essential exit pathway?",
    icon: "wind" as const,
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PromptChip({
  label,
  prompt,
  icon,
  onSelect,
}: {
  label: string;
  prompt: string;
  icon: "file-text" | "home" | "layers" | "wind";
  onSelect: (prompt: string) => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(prompt);
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: FireOneColors.orange + "15" }]}>
        <Feather name={icon} size={14} color={FireOneColors.orange} />
      </View>
      <ThemedText style={styles.chipText}>{label}</ThemedText>
    </AnimatedPressable>
  );
}

export function PromptChips({ onSelect }: PromptChipsProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Suggested questions</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUGGESTED_PROMPTS.map((item, index) => (
          <PromptChip
            key={index}
            label={item.label}
            prompt={item.prompt}
            icon={item.icon}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 13,
    color: "#8E8E8E",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
