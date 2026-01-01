import React from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, FireOneColors } from "@/constants/theme";

interface FireOneLogoProps {
  size?: "small" | "medium" | "large";
  showSubtitle?: boolean;
  variant?: "full" | "icon" | "text";
}

export function FireOneLogo({ size = "medium", showSubtitle = true, variant = "full" }: FireOneLogoProps) {
  const { theme } = useTheme();
  
  const logoWidth = size === "small" ? 100 : size === "medium" ? 140 : 200;
  const logoHeight = size === "small" ? 40 : size === "medium" ? 56 : 80;
  const iconSize = size === "small" ? 28 : size === "medium" ? 40 : 56;
  const subtitleSize = size === "small" ? 10 : size === "medium" ? 12 : 14;
  const titleSize = size === "small" ? 18 : size === "medium" ? 22 : 28;

  if (variant === "icon") {
    return (
      <Image
        source={require("../../assets/images/flame-icon.png")}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    );
  }

  if (variant === "text") {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { fontSize: titleSize }]}>
          <Text style={{ color: FireOneColors.orange }}>FYRE</Text>
          <Text style={{ color: theme.text }}>ONE</Text>
        </Text>
        {showSubtitle ? (
          <ThemedText style={[styles.subtitle, { fontSize: subtitleSize, color: theme.textSecondary }]}>
            NSW Fire Safety Auditor Copilot
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/fyreone-logo.png")}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
      {showSubtitle ? (
        <ThemedText style={[styles.subtitle, { fontSize: subtitleSize, color: theme.textSecondary }]}>
          NSW Fire Safety Auditor Copilot
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  title: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontWeight: "400",
    marginTop: Spacing.xs,
  },
});
