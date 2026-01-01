import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { FireOneColors } from "@/constants/theme";

const STORAGE_KEY_AVATAR = "user_avatar_uri";
const STORAGE_KEY_NAME = "user_name";

interface UserAvatarProps {
  size?: number;
  imageUri?: string | null;
  name?: string | null;
  showBorder?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function UserAvatar({ size = 40, imageUri, name, showBorder = false }: UserAvatarProps) {
  const { theme } = useTheme();
  const initials = getInitials(name);

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: FireOneColors.orangeLight,
    },
    showBorder && {
      borderWidth: 2,
      borderColor: theme.border,
    },
  ];

  if (imageUri) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text
        style={[
          styles.initials,
          {
            fontSize: size * 0.4,
            color: FireOneColors.orange,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

export function useUserAvatar() {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAvatar = async () => {
    try {
      const [uri, name] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_AVATAR),
        AsyncStorage.getItem(STORAGE_KEY_NAME),
      ]);
      setAvatarUri(uri);
      setUserName(name);
    } catch (error) {
      console.error("Error loading avatar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAvatarUri = async (uri: string | null) => {
    try {
      if (uri) {
        await AsyncStorage.setItem(STORAGE_KEY_AVATAR, uri);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_AVATAR);
      }
      setAvatarUri(uri);
    } catch (error) {
      console.error("Error saving avatar:", error);
    }
  };

  useEffect(() => {
    loadAvatar();
  }, []);

  return {
    avatarUri,
    userName,
    isLoading,
    saveAvatarUri,
    refreshAvatar: loadAvatar,
  };
}

export { STORAGE_KEY_AVATAR };

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    fontWeight: "600",
  },
});
