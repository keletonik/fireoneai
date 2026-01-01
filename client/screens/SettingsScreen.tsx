import React, { useState, useEffect, memo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Switch,
  Linking,
  ActionSheetIOS,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useThemeMode } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { FireOneLogo } from "@/components/FireOneLogo";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { UserAvatar, STORAGE_KEY_AVATAR } from "@/components/UserAvatar";
import { getApiUrl } from "@/lib/query-client";

const STORAGE_KEYS = {
  USER_EMAIL: "@fyreone_user_email",
  USER_PHONE: "@fyreone_user_phone",
  USER_NAME: "user_name",
  USER_AVATAR: "user_avatar_uri",
  AI_INSTRUCTIONS: "@fyreone_ai_instructions",
  UPLOADED_FILES: "@fyreone_uploaded_files",
  MEMORY_ENABLED: "@fyreone_memory_enabled",
  AI_TONE: "@fyreone_ai_tone",
  NOTIFICATIONS_ENABLED: "@fyreone_notifications_enabled",
  HAPTIC_ENABLED: "@fyreone_haptic_enabled",
};

const AI_TONES = [
  { id: "professional", label: "Professional", icon: "briefcase" },
  { id: "friendly", label: "Friendly", icon: "smile" },
  { id: "concise", label: "Concise", icon: "minimize-2" },
  { id: "detailed", label: "Detailed", icon: "file-text" },
];

const AIInstructionsInput = memo(function AIInstructionsInput({ 
  value, 
  onChangeText, 
  backgroundColor,
  textColor,
  borderColor,
  placeholderColor,
}: { 
  value: string; 
  onChangeText: (text: string) => void; 
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <TextInput
      style={[
        styles.textArea,
        {
          backgroundColor,
          color: textColor,
          borderColor: isFocused ? FireOneColors.orange : borderColor,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder="Example: I primarily work on commercial buildings in Sydney CBD. Focus on Class 5-9 buildings. Always include AS 2118.1 references for sprinkler systems..."
      placeholderTextColor={placeholderColor}
      multiline
      numberOfLines={6}
      textAlignVertical="top"
      autoCorrect={false}
      spellCheck={false}
      blurOnSubmit={false}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
});

function SectionCard({ 
  children, 
  title, 
  icon, 
  iconColor,
  theme,
  collapsible = false,
  defaultExpanded = true,
}: { 
  children: React.ReactNode; 
  title: string; 
  icon: string; 
  iconColor: string;
  theme: any;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const handleToggle = async () => {
    if (collapsible) {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setIsExpanded(!isExpanded);
    }
  };
  
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.assistantBubble, borderColor: theme.border }]}>
      <Pressable 
        onPress={handleToggle}
        style={({ pressed }) => [styles.sectionHeader, pressed && collapsible && { opacity: 0.7 }]}
        disabled={!collapsible}
        accessibilityLabel={title}
        accessibilityHint={collapsible ? (isExpanded ? "Double tap to collapse" : "Double tap to expand") : undefined}
        accessibilityRole={collapsible ? "button" : undefined}
      >
        <View style={[styles.sectionIconContainer, { backgroundColor: withOpacity(iconColor, 0.1) }]}>
          <Feather name={icon as any} size={18} color={iconColor} />
        </View>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>{title}</ThemedText>
        {collapsible ? (
          <Feather 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={theme.textSecondary} 
            style={styles.sectionChevron}
          />
        ) : null}
      </Pressable>
      {isExpanded || !collapsible ? children : null}
    </View>
  );
}

const SettingsRowInput = memo(function SettingsRowInput({
  label,
  value,
  placeholder,
  keyboardType = "default",
  onChangeText,
  onBlur,
  backgroundColor,
  textColor,
  borderColor,
  labelColor,
  placeholderColor,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  labelColor: string;
  placeholderColor: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={styles.settingsRow}>
      <ThemedText style={[styles.fieldLabel, { color: labelColor }]}>{label}</ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor,
              color: textColor,
              borderColor: isFocused ? FireOneColors.orange : borderColor,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          keyboardType={keyboardType}
          autoCorrect={false}
          spellCheck={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
        />
      </View>
    </View>
  );
});

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uri: string;
  uploadedAt: string;
}

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [aiInstructions, setAiInstructions] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [aiTone, setAiTone] = useState("professional");
  const [hapticEnabled, setHapticEnabled] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [name, email, phone, avatar, instructions, files, memory, tone, notifications, haptic] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_AVATAR),
        AsyncStorage.getItem(STORAGE_KEYS.AI_INSTRUCTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.UPLOADED_FILES),
        AsyncStorage.getItem(STORAGE_KEYS.MEMORY_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.AI_TONE),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.HAPTIC_ENABLED),
      ]);

      if (name) setUserName(name);
      if (email) setUserEmail(email);
      if (phone) setUserPhone(phone);
      if (avatar) setUserAvatar(avatar);
      if (instructions) setAiInstructions(instructions);
      if (files) setUploadedFiles(JSON.parse(files));
      if (memory !== null) setMemoryEnabled(memory === "true");
      if (tone) setAiTone(tone);
      if (notifications !== null) setNotificationsEnabled(notifications === "true");
      if (haptic !== null) setHapticEnabled(haptic === "true");
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to set a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await saveAvatarUri(uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const saveAvatarUri = async (uri: string | null) => {
    try {
      if (uri) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_AVATAR, uri);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_AVATAR);
      }
      setUserAvatar(uri);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error saving avatar:", error);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Choose from Library", userAvatar ? "Remove Photo" : ""],
          cancelButtonIndex: 0,
          destructiveButtonIndex: userAvatar ? 2 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImage();
          } else if (buttonIndex === 2 && userAvatar) {
            saveAvatarUri(null);
          }
        }
      );
    } else {
      if (userAvatar) {
        Alert.alert("Profile Photo", "Choose an option", [
          { text: "Cancel", style: "cancel" },
          { text: "Choose from Library", onPress: pickImage },
          { text: "Remove Photo", style: "destructive", onPress: () => saveAvatarUri(null) },
        ]);
      } else {
        pickImage();
      }
    }
  };

  const saveField = async (key: string, value: string) => {
    try {
      setIsSaving(true);
      await AsyncStorage.setItem(key, value);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveAiInstructions = async () => {
    try {
      setIsSaving(true);
      await AsyncStorage.setItem(STORAGE_KEYS.AI_INSTRUCTIONS, aiInstructions);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      Alert.alert("Error", "Failed to save instructions. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMemoryToggle = async (value: boolean) => {
    setMemoryEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.MEMORY_ENABLED, value.toString());
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToneChange = async (toneId: string) => {
    setAiTone(toneId);
    await AsyncStorage.setItem(STORAGE_KEYS.AI_TONE, toneId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "text/*"],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles: UploadedFile[] = result.assets.map((asset) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: asset.name,
          size: asset.size || 0,
          type: asset.mimeType || "unknown",
          uri: asset.uri,
          uploadedAt: new Date().toISOString(),
        }));

        const updatedFiles = [...uploadedFiles, ...newFiles];
        setUploadedFiles(updatedFiles);
        await AsyncStorage.setItem(STORAGE_KEYS.UPLOADED_FILES, JSON.stringify(updatedFiles));

        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload file. Please try again.");
    }
  };

  const removeFile = async (fileId: string) => {
    Alert.alert("Remove File", "Are you sure you want to remove this file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const updatedFiles = uploadedFiles.filter((f) => f.id !== fileId);
          setUploadedFiles(updatedFiles);
          await AsyncStorage.setItem(STORAGE_KEYS.UPLOADED_FILES, JSON.stringify(updatedFiles));
          if (Platform.OS !== "web") {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
      },
    ]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "image";
    if (type === "application/pdf") return "file-text";
    return "file";
  };

  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "@fyreone_user",
              "@fyreone_session",
              "@fyreone_guest",
              "@fyreone_first_login",
              STORAGE_KEYS.USER_NAME,
              STORAGE_KEYS.USER_EMAIL,
              STORAGE_KEYS.USER_PHONE,
            ]);
            if (Platform.OS !== "web") {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will remove your access to all settings, uploaded documents, and conversation history from this device.\n\n*Please note: Your data is retained on our servers for legal and compliance purposes in accordance with applicable laws and regulations.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I Understand, Clear Data",
          style: "destructive",
          onPress: async () => {
            try {
              const userDataStr = await AsyncStorage.getItem("@fyreone_user");
              const userData = userDataStr ? JSON.parse(userDataStr) : null;
              const userId = userData?.id;

              if (userId) {
                const apiUrl = new URL("/api/account/clear", getApiUrl());
                const response = await fetch(apiUrl.toString(), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId }),
                });

                if (!response.ok) {
                  console.error("Failed to clear server data:", await response.text());
                }
              }

              await AsyncStorage.clear();
              setUserName("");
              setUserEmail("");
              setUserPhone("");
              setAiInstructions("");
              setUploadedFiles([]);
              setMemoryEnabled(true);
              setAiTone("professional");

              if (Platform.OS !== "web") {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }

              Alert.alert("Done", "Your local data has been cleared. Server data is retained for legal purposes.");
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert("Error", "Failed to clear data. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleArchiveExport = async () => {
    if (!userEmail) {
      Alert.alert(
        "Email Required",
        "Please add your email address in the Account section to export your chat history."
      );
      return;
    }

    Alert.alert(
      "Archive & Export Chats",
      `Your complete chat history will be sent to:\n${userEmail}\n\nWould you like to proceed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Export",
          onPress: async () => {
            try {
              const userDataStr = await AsyncStorage.getItem("@fyreone_user");
              const userData = userDataStr ? JSON.parse(userDataStr) : null;
              const userId = userData?.id;

              if (!userId) {
                Alert.alert("Error", "Could not find your user account. Please sign in again.");
                return;
              }

              const apiUrl = new URL("/api/account/export", getApiUrl());
              const response = await fetch(apiUrl.toString(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, email: userEmail }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                console.error("Export failed:", errorText);
                Alert.alert("Error", "Failed to request export. Please try again.");
                return;
              }

              const result = await response.json();

              if (Platform.OS !== "web") {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              Alert.alert(
                "Export Complete",
                `Found ${result.conversationCount || 0} conversation(s) with ${result.messageCount || 0} message(s).\n\nYour chat archive will be sent to ${userEmail}.`
              );
            } catch (error) {
              console.error("Export error:", error);
              Alert.alert("Error", "Failed to request export. Please try again.");
            }
          },
        },
      ]
    );
  };

  const openExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open link");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: theme.backgroundRoot, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <FireOneLogo size="medium" showSubtitle={false} variant="text" />
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={[styles.pageTitle, { color: theme.text }]}>Settings</ThemedText>
        <ThemedText style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
          Customize your FyreOne AI experience
        </ThemedText>

        <SectionCard title="Appearance" icon="moon" iconColor="#8B5CF6" theme={theme}>
          <View style={styles.themeOptions}>
            {(["light", "dark", "system"] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => {
                  setThemeMode(mode);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === mode ? withOpacity(FireOneColors.orange, 0.1) : theme.backgroundDefault,
                    borderColor: themeMode === mode ? FireOneColors.orange : theme.border,
                  },
                ]}
              >
                <Feather
                  name={mode === "light" ? "sun" : mode === "dark" ? "moon" : "smartphone"}
                  size={20}
                  color={themeMode === mode ? FireOneColors.orange : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.themeOptionText,
                    { color: themeMode === mode ? FireOneColors.orange : theme.text },
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="Account" icon="user" iconColor="#3B82F6" theme={theme}>
          <View style={styles.avatarSection}>
            <Pressable onPress={handleAvatarPress} style={styles.avatarButton}>
              <UserAvatar size={80} imageUri={userAvatar} name={userName} showBorder />
              <View style={[styles.avatarEditBadge, { backgroundColor: FireOneColors.orange }]}>
                <Feather name="camera" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <View style={styles.avatarInfo}>
              <ThemedText style={[styles.avatarLabel, { color: theme.text }]}>Profile Photo</ThemedText>
              <ThemedText style={[styles.avatarHint, { color: theme.textSecondary }]}>
                Tap to {userAvatar ? "change or remove" : "add"} photo
              </ThemedText>
            </View>
          </View>
          <SettingsRowInput
            label="Full Name"
            value={userName}
            placeholder="Enter your name"
            onChangeText={setUserName}
            onBlur={() => saveField(STORAGE_KEYS.USER_NAME, userName)}
            backgroundColor={theme.backgroundDefault}
            textColor={theme.text}
            borderColor={theme.border}
            labelColor={theme.textSecondary}
            placeholderColor={theme.textSecondary}
          />
          <SettingsRowInput
            label="Email Address"
            value={userEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            onChangeText={setUserEmail}
            onBlur={() => saveField(STORAGE_KEYS.USER_EMAIL, userEmail)}
            backgroundColor={theme.backgroundDefault}
            textColor={theme.text}
            borderColor={theme.border}
            labelColor={theme.textSecondary}
            placeholderColor={theme.textSecondary}
          />
          <SettingsRowInput
            label="Phone Number"
            value={userPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            onChangeText={setUserPhone}
            onBlur={() => saveField(STORAGE_KEYS.USER_PHONE, userPhone)}
            backgroundColor={theme.backgroundDefault}
            textColor={theme.text}
            borderColor={theme.border}
            labelColor={theme.textSecondary}
            placeholderColor={theme.textSecondary}
          />
        </SectionCard>

        <SectionCard title="AI Memory" icon="database" iconColor="#06B6D4" theme={theme}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>Remember Conversations</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                Allow FyreOne to remember context from previous conversations for more personalized responses
              </ThemedText>
            </View>
            <Switch
              value={memoryEnabled}
              onValueChange={handleMemoryToggle}
              trackColor={{ false: theme.border, true: withOpacity(FireOneColors.orange, 0.5) }}
              thumbColor={memoryEnabled ? FireOneColors.orange : theme.textSecondary}
            />
          </View>
        </SectionCard>

        <SectionCard title="AI Tone" icon="message-circle" iconColor="#F59E0B" theme={theme}>
          <ThemedText style={[styles.fieldDescription, { color: theme.textSecondary }]}>
            Choose how FyreOne AI communicates with you
          </ThemedText>
          <View style={styles.toneOptions}>
            {AI_TONES.map((tone) => (
              <Pressable
                key={tone.id}
                onPress={() => handleToneChange(tone.id)}
                style={[
                  styles.toneOption,
                  {
                    backgroundColor: aiTone === tone.id ? withOpacity(FireOneColors.orange, 0.1) : theme.backgroundDefault,
                    borderColor: aiTone === tone.id ? FireOneColors.orange : theme.border,
                  },
                ]}
              >
                <Feather
                  name={tone.icon as any}
                  size={18}
                  color={aiTone === tone.id ? FireOneColors.orange : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.toneOptionText,
                    { color: aiTone === tone.id ? FireOneColors.orange : theme.text },
                  ]}
                >
                  {tone.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="AI Personalization" icon="cpu" iconColor="#10B981" theme={theme} collapsible defaultExpanded={false}>
          <ThemedText style={[styles.fieldDescription, { color: theme.textSecondary }]}>
            Customize how FyreOne AI responds to your questions. Add specific context about your projects, preferences, or areas of focus.
          </ThemedText>
          <AIInstructionsInput
            value={aiInstructions}
            onChangeText={setAiInstructions}
            backgroundColor={theme.backgroundDefault}
            textColor={theme.text}
            borderColor={theme.border}
            placeholderColor={theme.textSecondary}
          />
          <Pressable
            onPress={saveAiInstructions}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: saveSuccess ? "#10B981" : FireOneColors.orange },
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
            disabled={isSaving || saveSuccess}
          >
            <Feather name={saveSuccess ? "check" : "save"} size={18} color="#FFFFFF" />
            <ThemedText style={styles.saveButtonText}>
              {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Instructions"}
            </ThemedText>
          </Pressable>
        </SectionCard>

        <SectionCard title="Document Library" icon="folder" iconColor="#F59E0B" theme={theme} collapsible defaultExpanded={false}>
          <ThemedText style={[styles.fieldDescription, { color: theme.textSecondary }]}>
            Upload reference documents, floor plans, or compliance reports for quick access during conversations.
          </ThemedText>

          {uploadedFiles.length > 0 ? (
            <View style={styles.filesList}>
              {uploadedFiles.map((file) => (
                <View
                  key={file.id}
                  style={[styles.fileItem, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                >
                  <View style={[styles.fileIconContainer, { backgroundColor: withOpacity("#F59E0B", 0.1) }]}>
                    <Feather name={getFileIcon(file.type) as any} size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.fileInfo}>
                    <ThemedText style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                      {file.name}
                    </ThemedText>
                    <ThemedText style={[styles.fileSize, { color: theme.textSecondary }]}>
                      {formatFileSize(file.size)}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => removeFile(file.id)}
                    style={({ pressed }) => [styles.removeFileButton, pressed && styles.pressed]}
                  >
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={handleFilePick}
            style={({ pressed }) => [
              styles.uploadButton,
              { borderColor: FireOneColors.orange, backgroundColor: withOpacity(FireOneColors.orange, 0.05) },
              pressed && styles.pressed,
            ]}
          >
            <Feather name="upload-cloud" size={24} color={FireOneColors.orange} />
            <ThemedText style={[styles.uploadButtonText, { color: FireOneColors.orange }]}>
              Upload Documents
            </ThemedText>
            <ThemedText style={[styles.uploadHint, { color: theme.textSecondary }]}>
              PDF, Images, or Text files
            </ThemedText>
          </Pressable>
        </SectionCard>

        <SectionCard title="Notifications" icon="bell" iconColor="#EC4899" theme={theme}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>Push Notifications</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                Get alerts for compliance updates and reminders
              </ThemedText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={async (value) => {
                setNotificationsEnabled(value);
                await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, value.toString());
                if (Platform.OS !== "web" && hapticEnabled) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              trackColor={{ false: theme.border, true: withOpacity(FireOneColors.orange, 0.5) }}
              thumbColor={notificationsEnabled ? FireOneColors.orange : theme.textSecondary}
            />
          </View>
        </SectionCard>

        <SectionCard title="Haptic Feedback" icon="smartphone" iconColor="#8B5CF6" theme={theme}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>Enable Haptics</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                Feel subtle vibrations when interacting with the app
              </ThemedText>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={async (value) => {
                setHapticEnabled(value);
                await AsyncStorage.setItem(STORAGE_KEYS.HAPTIC_ENABLED, value.toString());
                if (Platform.OS !== "web" && value) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              }}
              trackColor={{ false: theme.border, true: withOpacity(FireOneColors.orange, 0.5) }}
              thumbColor={hapticEnabled ? FireOneColors.orange : theme.textSecondary}
            />
          </View>
        </SectionCard>

        <SectionCard title="Privacy & Security" icon="shield" iconColor="#6366F1" theme={theme}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>Analytics</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                Help improve FyreOne AI by sharing anonymous usage data
              </ThemedText>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={(value) => {
                setAnalyticsEnabled(value);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              trackColor={{ false: theme.border, true: withOpacity(FireOneColors.orange, 0.5) }}
              thumbColor={analyticsEnabled ? FireOneColors.orange : theme.textSecondary}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={handleArchiveExport}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.toggleInfo}>
              <ThemedText style={[styles.actionLabel, { color: theme.text }]}>Archive & Export Chats</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                Send all chat history to your email
              </ThemedText>
            </View>
            <Feather name="download" size={18} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={handleClearData}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.actionLabel, { color: "#EF4444" }]}>Clear All Data</ThemedText>
            <Feather name="trash-2" size={18} color="#EF4444" />
          </Pressable>
        </SectionCard>

        <SectionCard title="Support" icon="help-circle" iconColor="#14B8A6" theme={theme} collapsible defaultExpanded={false}>
          <Pressable
            onPress={() => openExternalLink("mailto:support@fireone.net")}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.toggleInfo}>
              <ThemedText style={[styles.actionLabel, { color: theme.text }]}>Contact Support</ThemedText>
              <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                support@fireone.net
              </ThemedText>
            </View>
            <Feather name="mail" size={18} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => openExternalLink("https://fireone.net/faq")}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.actionLabel, { color: theme.text }]}>FAQ</ThemedText>
            <Feather name="external-link" size={18} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => openExternalLink("https://fireone.net/feedback")}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.actionLabel, { color: theme.text }]}>Send Feedback</ThemedText>
            <Feather name="message-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        </SectionCard>

        <SectionCard title="Legal" icon="file-text" iconColor="#78716C" theme={theme} collapsible defaultExpanded={false}>
          <Pressable
            onPress={() => openExternalLink("https://fireone.net/terms")}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.actionLabel, { color: theme.text }]}>Terms of Service</ThemedText>
            <Feather name="external-link" size={18} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => openExternalLink("https://fireone.net/privacy")}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.actionLabel, { color: theme.text }]}>Privacy Policy</ThemedText>
            <Feather name="external-link" size={18} color={theme.textSecondary} />
          </Pressable>
        </SectionCard>

        <SectionCard title="About" icon="info" iconColor={theme.textSecondary} theme={theme}>
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutLabel, { color: theme.textSecondary }]}>Version</ThemedText>
            <ThemedText style={[styles.aboutValue, { color: theme.text }]}>1.0.0</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutLabel, { color: theme.textSecondary }]}>Developer</ThemedText>
            <ThemedText style={[styles.aboutValue, { color: theme.text }]}>Mentaris Group</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => openExternalLink("https://www.mentaris.io/fireone")}
            style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.aboutLabel, { color: theme.textSecondary }]}>Website</ThemedText>
            <View style={styles.aboutLinkRow}>
              <ThemedText style={[styles.aboutValue, { color: FireOneColors.orange }]}>mentaris.io/fireone</ThemedText>
              <Feather name="external-link" size={14} color={FireOneColors.orange} style={{ marginLeft: Spacing.xs }} />
            </View>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutLabel, { color: theme.textSecondary }]}>Build</ThemedText>
            <ThemedText style={[styles.aboutValue, { color: theme.text }]}>2025.12.29</ThemedText>
          </View>
        </SectionCard>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: withOpacity("#EF4444", 0.1), borderColor: "#EF4444" },
            pressed && styles.pressed,
          ]}
        >
          <Feather name="log-out" size={20} color="#EF4444" />
          <ThemedText style={[styles.logoutButtonText, { color: "#EF4444" }]}>Sign Out</ThemedText>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  sectionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionChevron: {
    marginLeft: "auto",
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  themeOptions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toneOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  toneOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  toneOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  settingsRow: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  fieldDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: Spacing.lg,
    fontSize: 15,
    minHeight: 140,
    lineHeight: 22,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  filesList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  fileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 13,
  },
  removeFileButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  uploadButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  uploadHint: {
    fontSize: 13,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  aboutLabel: {
    fontSize: 15,
  },
  aboutValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  aboutLinkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginTop: Spacing.md,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  avatarButton: {
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarInfo: {
    flex: 1,
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  avatarHint: {
    fontSize: 14,
  },
});
