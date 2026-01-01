import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

export function WelcomeCard() {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: withOpacity(FireOneColors.orange, 0.1) }]}>
        <Image
          source={require("../../assets/images/flame-icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
      
      <ThemedText style={styles.appName}>FyreOne AI</ThemedText>
      
      <ThemedText style={styles.title}>NSW Fire Safety Auditor Copilot</ThemedText>
      
      <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
        Ask questions about NSW fire safety compliance, AFSS requirements, essential fire safety measures, or NCC/BCA provisions.
      </ThemedText>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={16} color={FireOneColors.orange} />
          </View>
          <ThemedText style={styles.featureText}>Instantly answers complex fire safety queries</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="book-open" size={16} color={FireOneColors.orange} />
          </View>
          <ThemedText style={styles.featureText}>Cites NCC clauses and Australian Standards</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="shield" size={16} color={FireOneColors.orange} />
          </View>
          <ThemedText style={styles.featureText}>Built for Australian fire safety professionals</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  icon: {
    width: 48,
    height: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  features: {
    gap: Spacing.md,
    width: "100%",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
});
