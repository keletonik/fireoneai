import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatScreen from "@/screens/ChatScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SearchScreen from "@/screens/SearchScreen";
import TemplatesScreen from "@/screens/TemplatesScreen";
import PhotoAnnotationScreen from "@/screens/PhotoAnnotationScreen";
import NotebooksScreen from "@/screens/NotebooksScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

const HAS_SEEN_LOGIN_KEY = "@fyreone_has_seen_login";

export type RootStackParamList = {
  Login: undefined;
  Chat: { conversationId?: number } | undefined;
  Settings: undefined;
  Search: undefined;
  Templates: { onSelectTemplate?: (content: string) => void } | undefined;
  PhotoAnnotation: { imageUri: string; onSave?: (uri: string) => void } | undefined;
  Notebooks: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const [hasSeenLogin, setHasSeenLogin] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HAS_SEEN_LOGIN_KEY).then((value) => {
      setHasSeenLogin(value === "true");
    });
  }, []);

  if (hasSeenLogin === null) {
    return null;
  }

  return (
    <Stack.Navigator 
      screenOptions={screenOptions}
      initialRouteName={hasSeenLogin ? "Chat" : "Login"}
    >
      <Stack.Screen
        name="Login"
        options={{ headerShown: false, gestureEnabled: false }}
      >
        {(props) => (
          <LoginScreen
            {...props}
            variant="light"
            onSkip={async () => {
              await AsyncStorage.setItem(HAS_SEEN_LOGIN_KEY, "true");
              props.navigation.reset({
                index: 0,
                routes: [{ name: "Chat" }],
              });
            }}
            onSignIn={async () => {
              await AsyncStorage.setItem(HAS_SEEN_LOGIN_KEY, "true");
              props.navigation.reset({
                index: 0,
                routes: [{ name: "Chat" }],
              });
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Templates"
        component={TemplatesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PhotoAnnotation"
        component={PhotoAnnotationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notebooks"
        component={NotebooksScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
