import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { FyreOneWordmark } from "@/components/FyreOneWordmark";
import { FireSafetyGrid } from "@/components/FireSafetyGrid";
import { Spacing, BorderRadius, FireOneColors } from "@/constants/theme";

interface LoginScreenProps {
  onSignIn?: (email: string, password: string) => void;
  onSignUp?: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  error?: string;
  variant?: "light" | "dark";
}

export function LoginScreen({
  onSignIn,
  onSignUp,
  onSkip,
  isLoading = false,
  error,
  variant = "light",
}: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const isDark = variant === "dark";
  const { width } = Dimensions.get("window");
  
  const badgeOpacity = useSharedValue(0);
  const badgeTranslateY = useSharedValue(20);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(20);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(20);
  const footerOpacity = useSharedValue(0);
  
  useEffect(() => {
    badgeOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    badgeTranslateY.value = withDelay(100, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    logoTranslateY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    
    formOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    formTranslateY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    
    footerOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
  }, []);
  
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ translateY: badgeTranslateY.value }],
  }));
  
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));
  
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));
  
  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));
  
  const handleSubmit = () => {
    onSignIn?.(email, password);
  };
  
  const bgColors: readonly [string, string, string] = isDark 
    ? ["#020617", "#0f172a", "#020617"]
    : ["#f8fafc", "#ffffff", "#f8fafc"];
  
  const inputBg = isDark ? "rgba(51, 65, 85, 0.5)" : "#ffffff";
  const inputBorder = isDark ? "#475569" : "#e2e8f0";
  const inputText = isDark ? "#f8fafc" : "#1e293b";
  const placeholderColor = isDark ? "#64748b" : "#94a3b8";
  const cardBg = isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.8)";
  const cardBorder = isDark ? "#1e293b" : "#f1f5f9";
  
  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <FireSafetyGrid isDark={isDark} />
      
      {isDark ? null : (
        <View style={styles.topAccent}>
          <LinearGradient
            colors={["transparent", FireOneColors.orange, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentGradient}
          />
        </View>
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.content, { paddingTop: insets.top + Spacing.xl }]}
      >
        <View style={styles.centerContent}>
          <Animated.View style={[styles.badgeContainer, badgeStyle]}>
            <View style={[
              styles.badge,
              { 
                backgroundColor: isDark ? "rgba(249, 115, 22, 0.1)" : "rgba(249, 115, 22, 0.1)",
                borderColor: isDark ? "rgba(249, 115, 22, 0.2)" : "rgba(249, 115, 22, 0.2)",
              }
            ]}>
              <View style={styles.badgeDot} />
              <ThemedText style={[styles.badgeText, { color: FireOneColors.orange }]}>
                AI-POWERED COMPLIANCE
              </ThemedText>
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <FyreOneWordmark height={40} isDark={isDark} />
            <ThemedText style={[
              styles.subtitle,
              { color: isDark ? "#94a3b8" : "#64748b" }
            ]}>
              NSW Fire Safety Compliance
            </ThemedText>
          </Animated.View>
          
          <Animated.View style={[styles.formContainer, formStyle]}>
            <View style={[
              styles.card,
              { 
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }
            ]}>
              {error ? (
                <View style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}
              
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: inputText,
                  }
                ]}
                placeholder="Email"
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: inputText,
                  }
                ]}
                placeholder="Password"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
              
              <Pressable
                style={[styles.button, isLoading ? styles.buttonDisabled : null]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText style={styles.buttonText}>Sign in</ThemedText>
                )}
              </Pressable>
              
              <View style={styles.signupRow}>
                <ThemedText style={[styles.signupText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                  New here?{" "}
                </ThemedText>
                <Pressable onPress={onSignUp}>
                  <ThemedText style={[styles.signupLink, { color: FireOneColors.orange }]}>
                    Create account
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            
            {onSkip ? (
              <Pressable onPress={onSkip} style={styles.skipButton}>
                <ThemedText style={[styles.skipText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
                  Continue without signing in
                </ThemedText>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
        
        <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }, footerStyle]}>
          <ThemedText style={[styles.footerText, { color: isDark ? "#64748b" : "#94a3b8" }]}>
            Powered by{" "}
          </ThemedText>
          <ThemedText style={[styles.footerBrand, { color: isDark ? "#64748b" : "#64748b" }]}>
            MENT
          </ThemedText>
          <ThemedText style={[styles.footerBrandA, { color: "#06b6d4" }]}>
            A
          </ThemedText>
          <ThemedText style={[styles.footerBrand, { color: isDark ? "#64748b" : "#64748b" }]}>
            RIS
          </ThemedText>
        </Animated.View>
      </KeyboardAvoidingView>
      
      {isDark ? (
        <View style={styles.bottomAccent}>
          <LinearGradient
            colors={["transparent", "rgba(249, 115, 22, 0.4)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentGradient}
          />
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 10,
  },
  bottomAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  accentGradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  badgeContainer: {
    marginBottom: Spacing.lg,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: FireOneColors.orange,
    marginRight: Spacing.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  subtitle: {
    fontSize: 16,
    marginTop: Spacing.md,
  },
  formContainer: {
    width: "100%",
    maxWidth: 360,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  button: {
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: FireOneColors.orange,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  skipButton: {
    marginTop: Spacing.xl,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
  footerBrandA: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default LoginScreen;
