import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatScreen from "@/screens/ChatScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SearchScreen from "@/screens/SearchScreen";
import TemplatesScreen from "@/screens/TemplatesScreen";
import PhotoAnnotationScreen from "@/screens/PhotoAnnotationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Chat: { conversationId?: number } | undefined;
  Settings: undefined;
  Search: undefined;
  Templates: { onSelectTemplate?: (content: string) => void } | undefined;
  PhotoAnnotation: { imageUri: string; onSave?: (uri: string) => void } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    </Stack.Navigator>
  );
}
