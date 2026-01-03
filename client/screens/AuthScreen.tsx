import React, { useState, memo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import { FyreOneWordmark } from "@/components/FyreOneWordmark";

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "sentences";
  secureTextEntry?: boolean;
  showToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  required?: boolean;
}

const InputField = memo(function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  secureTextEntry = false,
  showToggle = false,
  showPassword = false,
  onTogglePassword,
  required = false,
}: InputFieldProps) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
        {label}{required ? " *" : ""}
      </ThemedText>
      <View style={showToggle ? styles.passwordContainer : undefined}>
        <TextInput
          style={[
            styles.input,
            showToggle && styles.passwordInput,
            { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry && !showPassword}
          autoComplete={keyboardType === "email-address" ? "email" : undefined}
        />
        {showToggle && onTogglePassword ? (
          <Pressable
            onPress={onTogglePassword}
            style={styles.eyeButton}
          >
            <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

interface AuthScreenProps {
  onAuthSuccess: (user: { id: string; email: string; name: string | null }) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!isLogin && !fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const body = isLogin
        ? { email: email.trim(), password }
        : { 
            email: email.trim(), 
            password, 
            name: fullName.trim(),
            company: company.trim() || undefined,
            phone: phone.trim() || undefined,
          };

      const response = await apiRequest("POST", endpoint, body);
      const data = await response.json();

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await AsyncStorage.setItem("@fyreone_user", JSON.stringify(data.user));
      
      if (!isLogin) {
        if (fullName.trim()) await AsyncStorage.setItem("@fyreone_user_name", fullName.trim());
        if (company.trim()) await AsyncStorage.setItem("@fyreone_user_company", company.trim());
        if (phone.trim()) await AsyncStorage.setItem("@fyreone_user_phone", phone.trim());
        if (email.trim()) await AsyncStorage.setItem("@fyreone_user_email", email.trim());
      }

      await AsyncStorage.removeItem("@fyreone_first_login");
      
      onAuthSuccess(data.user);
    } catch (error: any) {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", error.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const skipAuth = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await AsyncStorage.setItem("@fyreone_guest", "true");
    await AsyncStorage.removeItem("@fyreone_first_login");
    onAuthSuccess({ id: "guest", email: "", name: "Guest" });
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <FyreOneWordmark height={40} isDark={isDark} />
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.assistantBubble, borderColor: theme.border }]}>
          <ThemedText style={[styles.formTitle, { color: theme.text }]}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </ThemedText>
          <ThemedText style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            {isLogin
              ? "Sign in to access your conversations"
              : "Join FyreOne AI for personalized fire safety guidance"}
          </ThemedText>

          {!isLogin ? (
            <>
              <InputField
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                required
              />
              <InputField
                label="Company"
                value={company}
                onChangeText={setCompany}
                placeholder="Enter your company name"
                autoCapitalize="words"
              />
              <InputField
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </>
          ) : null}

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            required
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            showToggle
            showPassword={showPassword}
            onTogglePassword={togglePassword}
            required
          />

          <Pressable
            onPress={handleAuth}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.authButton,
              { backgroundColor: FireOneColors.orange },
              pressed && styles.pressed,
              isLoading && styles.disabled,
            ]}
          >
            {isLoading ? (
              <ThemedText style={styles.authButtonText}>
                {isLogin ? "Signing in..." : "Creating account..."}
              </ThemedText>
            ) : (
              <>
                <Feather name={isLogin ? "log-in" : "user-plus"} size={20} color="#FFFFFF" />
                <ThemedText style={styles.authButtonText}>
                  {isLogin ? "Sign In" : "Create Account"}
                </ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setIsLogin(!isLogin);
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            style={styles.switchButton}
          >
            <ThemedText style={[styles.switchText, { color: theme.textSecondary }]}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <ThemedText style={{ color: FireOneColors.orange, fontWeight: "600" }}>
                {isLogin ? "Sign Up" : "Sign In"}
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>

        <Pressable
          onPress={skipAuth}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
        >
          <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
            Continue as Guest
          </ThemedText>
          <Feather name="arrow-right" size={16} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.proSection}>
          <View style={[styles.proBadge, { backgroundColor: withOpacity(FireOneColors.orange, 0.1) }]}>
            <Feather name="zap" size={14} color={FireOneColors.orange} />
            <ThemedText style={[styles.proText, { color: FireOneColors.orange }]}>Pro Features Coming Soon</ThemedText>
          </View>
          <ThemedText style={[styles.proDescription, { color: theme.textSecondary }]}>
            Unlimited conversations, document analysis, priority support, and more.
          </ThemedText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  formCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 14,
  },
  authButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  authButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  switchButton: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  skipText: {
    fontSize: 14,
  },
  proSection: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  proText: {
    fontSize: 12,
    fontWeight: "600",
  },
  proDescription: {
    fontSize: 12,
    textAlign: "center",
  },
});
