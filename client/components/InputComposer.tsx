import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { View, TextInput, Pressable, StyleSheet, Platform, FlatList, Keyboard, Alert, Image, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows, FireOneColors, withOpacity } from "@/constants/theme";
import { SLASH_COMMANDS, getMatchingCommands, parseSlashCommand, SlashCommand } from "@/lib/commands";

export interface Attachment {
  id: string;
  uri: string;
  name: string;
  type: "image" | "document";
  mimeType?: string;
}

interface InputComposerProps {
  onSend: (message: string, command?: SlashCommand, attachments?: Attachment[]) => void;
  onVoicePress?: () => void;
  disabled?: boolean;
  placeholder?: string;
  showVoiceButton?: boolean;
  prefillText?: string;
  onPrefillConsumed?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function InputComposer({
  onSend,
  onVoicePress,
  disabled = false,
  placeholder = "Ask a fire safety compliance question...",
  showVoiceButton = true,
  prefillText,
  onPrefillConsumed,
}: InputComposerProps) {
  const { theme, isDark } = useTheme();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const onPrefillConsumedRef = useRef(onPrefillConsumed);
  
  useEffect(() => {
    onPrefillConsumedRef.current = onPrefillConsumed;
  }, [onPrefillConsumed]);
  
  useEffect(() => {
    if (prefillText) {
      setText(prefillText);
      onPrefillConsumedRef.current?.();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [prefillText]);
  const [showCommands, setShowCommands] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scale = useSharedValue(1);

  const MAX_ATTACHMENTS = 10;

  const matchingCommands = useMemo(() => {
    if (!text.startsWith("/")) {
      return [];
    }
    return getMatchingCommands(text.split(" ")[0]);
  }, [text]);

  const shouldShowDropdown = showCommands && matchingCommands.length > 0;

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    if (newText.startsWith("/")) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((text.trim() || attachments.length > 0) && !disabled) {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const { command } = parseSlashCommand(text.trim());
      
      onSend(text.trim(), command || undefined, attachments.length > 0 ? attachments : undefined);
      setText("");
      setShowCommands(false);
      setAttachments([]);
    }
  }, [text, disabled, onSend, attachments]);

  const handleCommandSelect = useCallback((command: SlashCommand) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setText(command.name + " ");
    setShowCommands(false);
    inputRef.current?.focus();
  }, []);

  const handleCameraPress = useCallback(async () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert("Limit Reached", `You can only attach up to ${MAX_ATTACHMENTS} files at a time.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow camera access to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newAttachment: Attachment = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          uri: asset.uri,
          name: `Photo_${Date.now()}.jpg`,
          type: "image",
          mimeType: asset.mimeType || "image/jpeg",
        };
        setAttachments((prev) => [...prev, newAttachment]);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
    setShowAttachMenu(false);
  }, [attachments.length]);

  const handleImageLibraryPress = useCallback(async () => {
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      Alert.alert("Limit Reached", `You can only attach up to ${MAX_ATTACHMENTS} files at a time.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newAttachments: Attachment[] = result.assets.map((asset) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          uri: asset.uri,
          name: asset.fileName || `Image_${Date.now()}.jpg`,
          type: "image" as const,
          mimeType: asset.mimeType || "image/jpeg",
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select images. Please try again.");
    }
    setShowAttachMenu(false);
  }, [attachments.length]);

  const handleDocumentPress = useCallback(async () => {
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      Alert.alert("Limit Reached", `You can only attach up to ${MAX_ATTACHMENTS} files at a time.`);
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "text/*"],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const limitedAssets = result.assets.slice(0, remaining);
        const newAttachments: Attachment[] = limitedAssets.map((asset) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType?.startsWith("image/") ? "image" as const : "document" as const,
          mimeType: asset.mimeType || "application/octet-stream",
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select documents. Please try again.");
    }
    setShowAttachMenu(false);
  }, [attachments.length]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled;

  const renderCommandItem = useCallback(({ item }: { item: SlashCommand }) => (
    <Pressable
      onPress={() => handleCommandSelect(item)}
      style={({ pressed }) => [
        styles.commandItem,
        { backgroundColor: pressed ? theme.backgroundDefault : theme.backgroundRoot },
      ]}
    >
      <View style={[styles.commandIcon, { backgroundColor: withOpacity(FireOneColors.orange, 0.1) }]}>
        <Feather name={item.icon as any} size={16} color={FireOneColors.orange} />
      </View>
      <View style={styles.commandInfo}>
        <ThemedText style={[styles.commandName, { color: theme.text }]}>{item.name}</ThemedText>
        <ThemedText style={[styles.commandDesc, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.description}
        </ThemedText>
      </View>
    </Pressable>
  ), [theme, handleCommandSelect]);

  return (
    <BlurView 
      intensity={Platform.OS === "ios" ? 60 : 0} 
      tint={isDark ? "dark" : "light"} 
      style={[
        styles.wrapper, 
        { 
          backgroundColor: Platform.OS === "ios" 
            ? (isDark ? "rgba(30, 30, 30, 0.85)" : "rgba(255, 255, 255, 0.85)") 
            : theme.backgroundDefault 
        }
      ]}
    >
      {shouldShowDropdown ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={[styles.commandDropdown, { backgroundColor: theme.backgroundRoot, borderColor: theme.border }]}
        >
          <ThemedText style={[styles.dropdownTitle, { color: theme.textSecondary }]}>Commands</ThemedText>
          <FlatList
            data={matchingCommands}
            renderItem={renderCommandItem}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            style={styles.commandList}
          />
        </Animated.View>
      ) : null}

      {showAttachMenu ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={[styles.attachMenu, { backgroundColor: theme.backgroundRoot, borderColor: theme.border }]}
        >
          <Pressable
            onPress={handleCameraPress}
            style={({ pressed }) => [styles.attachMenuItem, pressed && { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.attachMenuIcon, { backgroundColor: withOpacity("#3B82F6", 0.1) }]}>
              <Feather name="camera" size={18} color="#3B82F6" />
            </View>
            <ThemedText style={[styles.attachMenuText, { color: theme.text }]}>Take Photo</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleImageLibraryPress}
            style={({ pressed }) => [styles.attachMenuItem, pressed && { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.attachMenuIcon, { backgroundColor: withOpacity("#10B981", 0.1) }]}>
              <Feather name="image" size={18} color="#10B981" />
            </View>
            <ThemedText style={[styles.attachMenuText, { color: theme.text }]}>Photo Library</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleDocumentPress}
            style={({ pressed }) => [styles.attachMenuItem, pressed && { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.attachMenuIcon, { backgroundColor: withOpacity("#F59E0B", 0.1) }]}>
              <Feather name="file" size={18} color="#F59E0B" />
            </View>
            <ThemedText style={[styles.attachMenuText, { color: theme.text }]}>Documents</ThemedText>
          </Pressable>
          <ThemedText style={[styles.attachMenuHint, { color: theme.textSecondary }]}>
            Max {MAX_ATTACHMENTS} files at a time
          </ThemedText>
        </Animated.View>
      ) : null}
      
      <View style={[styles.container, Shadows.medium]}>
        {attachments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.attachmentPreview}
            contentContainerStyle={styles.attachmentPreviewContent}
          >
            {attachments.map((attachment) => (
              <View key={attachment.id} style={[styles.attachmentItem, { backgroundColor: theme.backgroundSecondary }]}>
                {attachment.type === "image" ? (
                  <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
                ) : (
                  <View style={[styles.attachmentDoc, { backgroundColor: withOpacity(FireOneColors.orange, 0.1) }]}>
                    <Feather name="file-text" size={20} color={FireOneColors.orange} />
                  </View>
                )}
                <ThemedText style={[styles.attachmentName, { color: theme.text }]} numberOfLines={1}>
                  {attachment.name}
                </ThemedText>
                <Pressable
                  onPress={() => removeAttachment(attachment.id)}
                  style={[styles.attachmentRemove, { backgroundColor: theme.backgroundTertiary }]}
                >
                  <Feather name="x" size={12} color={theme.text} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundRoot, borderColor: theme.border }]}>
          <Pressable
            onPress={() => setShowAttachMenu(!showAttachMenu)}
            style={({ pressed }) => [
              styles.attachButton,
              { 
                backgroundColor: showAttachMenu 
                  ? FireOneColors.orange 
                  : (pressed ? withOpacity(FireOneColors.orange, 0.15) : withOpacity(FireOneColors.orange, 0.1))
              },
            ]}
          >
            <Feather name="paperclip" size={20} color={showAttachMenu ? "#FFFFFF" : FireOneColors.orange} />
          </Pressable>
          {showVoiceButton && onVoicePress ? (
            <Pressable
              onPress={onVoicePress}
              style={({ pressed }) => [
                styles.voiceButton,
                { 
                  backgroundColor: pressed 
                    ? withOpacity(FireOneColors.orange, 0.15) 
                    : withOpacity(FireOneColors.orange, 0.1)
                },
              ]}
            >
              <Feather name="mic" size={20} color={FireOneColors.orange} />
            </Pressable>
          ) : null}
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }, !showVoiceButton && styles.inputNoVoice]}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
            editable={!disabled}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            autoCorrect={false}
            spellCheck={false}
            onFocus={() => setShowAttachMenu(false)}
          />
          <AnimatedPressable
            onPress={handleSend}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!canSend}
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? FireOneColors.orange : withOpacity(FireOneColors.orange, 0.1),
              },
              animatedStyle,
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={canSend ? "#FFFFFF" : FireOneColors.orange}
              style={styles.sendIcon}
            />
          </AnimatedPressable>
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    minHeight: 48,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  inputNoVoice: {
    paddingLeft: Spacing.lg,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: {
    marginLeft: 0,
  },
  commandDropdown: {
    position: "absolute",
    bottom: "100%",
    left: Spacing.lg,
    right: Spacing.lg,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    maxHeight: 280,
    overflow: "hidden",
    ...Shadows.large,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commandList: {
    maxHeight: 240,
  },
  commandItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  commandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  commandInfo: {
    flex: 1,
  },
  commandName: {
    fontSize: 14,
    fontWeight: "600",
  },
  commandDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  attachMenu: {
    position: "absolute",
    bottom: "100%",
    left: Spacing.lg,
    right: Spacing.lg,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    ...Shadows.large,
  },
  attachMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  attachMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  attachMenuText: {
    fontSize: 15,
    fontWeight: "500",
  },
  attachMenuHint: {
    fontSize: 12,
    textAlign: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  attachmentPreview: {
    marginBottom: Spacing.sm,
  },
  attachmentPreviewContent: {
    gap: Spacing.sm,
  },
  attachmentItem: {
    width: 80,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    alignItems: "center",
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xs,
  },
  attachmentDoc: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: {
    fontSize: 10,
    marginTop: Spacing.xs,
    width: "100%",
  },
  attachmentRemove: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
