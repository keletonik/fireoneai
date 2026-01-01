import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import AuthScreen from "@/screens/AuthScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider, useThemeMode } from "@/contexts/ThemeContext";
import { LoadingSquares } from "@/components/LoadingSquares";
import { ThemedText } from "@/components/ThemedText";
import { FireOneColors } from "@/constants/theme";

interface User {
  id: string;
  email: string;
  name: string | null;
}

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.splashContent}>
        <Image
          source={require("../assets/images/flame-icon.png")}
          style={styles.splashIcon}
          resizeMode="contain"
        />
        <ThemedText style={styles.splashTitle}>FyreOne AI</ThemedText>
        <ThemedText style={styles.splashSubtitle}>NSW Fire Safety Copilot</ThemedText>
        <View style={styles.splashLoader}>
          <LoadingSquares size="medium" color={FireOneColors.orange} />
        </View>
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    </View>
  );
}

function AppContent() {
  const { isDark } = useThemeMode();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const checkAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@fyreone_user");
      const isGuest = await AsyncStorage.getItem("@fyreone_guest");
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else if (isGuest === "true") {
        setUser({ id: "guest", email: "", name: "Guest" });
      }
    } catch (error) {
      console.error("Failed to check auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = useCallback((authenticatedUser: User) => {
    setUser(authenticatedUser);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        {user ? (
          <NavigationContainer>
            <RootStackNavigator />
          </NavigationContainer>
        ) : (
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        )}
        <StatusBar style={isDark ? "light" : "dark"} />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    alignItems: "center",
    justifyContent: "center",
  },
  splashContent: {
    alignItems: "center",
  },
  splashIcon: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 48,
  },
  splashLoader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
});
