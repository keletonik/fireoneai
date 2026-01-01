import React from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";

export interface MessageAttachment {
  id: string;
  uri: string;
  name: string;
  type: "image" | "document";
  mimeType?: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  attachments?: MessageAttachment[];
  isFavorite?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  onLongPress?: () => void;
  onNextStepPress?: (step: string) => void;
  onFavoritePress?: (messageId: number) => void;
  userAvatarUri?: string | null;
  userName?: string | null;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_{3}(.*?)_{3}/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/---+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\*+\s*$/gm, '')
    .replace(/^-+\s*$/gm, '')
    .trim();
}

export function MessageBubble({ message, onLongPress, onNextStepPress, onFavoritePress, userAvatarUri, userName }: MessageBubbleProps) {
  const { theme, isDark } = useTheme();
  const isUser = message.role === "user";
  const [isFavorite, setIsFavorite] = React.useState(message.isFavorite || false);
  const [showActionMenu, setShowActionMenu] = React.useState(false);

  const handleLongPress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowActionMenu(true);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowActionMenu(false);
    onLongPress?.();
  };

  const handleFavorite = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsFavorite(!isFavorite);
    onFavoritePress?.(message.id);
    setShowActionMenu(false);
  };

  const renderAssistantContent = () => {
    const sections = parseAssistantContent(message.content);
    
    return (
      <View style={styles.assistantContent}>
        {sections.summary ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withOpacity(FireOneColors.orange, 0.12) }]}>
                <Feather name="info" size={14} color={FireOneColors.orange} />
              </View>
              <ThemedText style={[styles.sectionTitle, { color: FireOneColors.orange }]}>What this means</ThemedText>
            </View>
            <ThemedText style={[styles.sectionContent, { color: theme.text }]}>{sections.summary}</ThemedText>
          </View>
        ) : null}
        
        {sections.references && sections.references.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withOpacity("#3B82F6", 0.12) }]}>
                <Feather name="book-open" size={14} color="#3B82F6" />
              </View>
              <ThemedText style={[styles.sectionTitle, { color: "#3B82F6" }]}>References</ThemedText>
            </View>
            {sections.references.map((ref, idx) => (
              <View key={idx} style={[styles.referenceItem, { backgroundColor: isDark ? withOpacity("#3B82F6", 0.08) : withOpacity("#3B82F6", 0.05) }]}>
                <Feather name="file-text" size={14} color="#3B82F6" style={styles.referenceIcon} />
                <ThemedText style={[styles.referenceText, { color: theme.text }]}>{ref}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}
        
        {sections.assumptions && sections.assumptions.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withOpacity("#F59E0B", 0.12) }]}>
                <Feather name="alert-circle" size={14} color="#F59E0B" />
              </View>
              <ThemedText style={[styles.sectionTitle, { color: "#F59E0B" }]}>Assumptions</ThemedText>
            </View>
            <View style={[styles.assumptionsBox, { backgroundColor: isDark ? withOpacity("#F59E0B", 0.06) : withOpacity("#F59E0B", 0.05), borderColor: withOpacity("#F59E0B", 0.2) }]}>
              {sections.assumptions.map((assumption, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <View style={[styles.bullet, { backgroundColor: "#F59E0B" }]} />
                  <ThemedText style={[styles.bulletText, { color: theme.text }]}>{assumption}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        
        {sections.nextSteps && sections.nextSteps.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withOpacity("#10B981", 0.12) }]}>
                <Feather name="check-circle" size={14} color="#10B981" />
              </View>
              <ThemedText style={[styles.sectionTitle, { color: "#10B981" }]}>Next Steps</ThemedText>
              {onNextStepPress ? (
                <ThemedText style={[styles.tapHint, { color: theme.textSecondary }]}>Tap to ask</ThemedText>
              ) : null}
            </View>
            {sections.nextSteps.map((step, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  if (onNextStepPress) {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    onNextStepPress(step);
                  }
                }}
                style={({ pressed }) => [
                  styles.checklistItem,
                  onNextStepPress ? styles.clickableStep : null,
                  onNextStepPress ? { backgroundColor: isDark ? withOpacity("#10B981", 0.08) : withOpacity("#10B981", 0.05) } : null,
                  pressed && onNextStepPress ? styles.stepPressed : null,
                ]}
              >
                <View style={[styles.stepNumber, { backgroundColor: "#10B981" }]}>
                  <ThemedText style={styles.stepNumberText}>{idx + 1}</ThemedText>
                </View>
                <ThemedText style={[styles.checklistText, { color: theme.text }]}>{step}</ThemedText>
                {onNextStepPress ? (
                  <Feather name="arrow-right" size={16} color="#10B981" style={styles.stepArrow} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {!sections.summary && !sections.references?.length && !sections.assumptions?.length && !sections.nextSteps?.length ? (
          <ThemedText style={[styles.plainContent, { color: theme.text }]}>{stripMarkdown(message.content)}</ThemedText>
        ) : null}
        
        <View style={[styles.disclaimerBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
          <Feather name="shield" size={12} color={theme.textSecondary} style={styles.disclaimerIcon} />
          <ThemedText style={[styles.disclaimer, { color: theme.textSecondary }]}>
            Not legal advice. Verify against current NCC/standards and local authority requirements.
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser ? (
        <View style={styles.avatarContainer}>
          <View style={[styles.flameContainer, { backgroundColor: FireOneColors.orange + "15" }]}>
            <Image
              source={require("../../assets/images/flame-icon.png")}
              style={styles.flameIcon}
              resizeMode="contain"
            />
          </View>
        </View>
      ) : null}
      
      <Pressable
        onLongPress={handleLongPress}
        style={({ pressed }) => [
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.userBubble }]
            : [styles.assistantBubble, { backgroundColor: theme.assistantBubble, borderColor: theme.border }],
          pressed && styles.pressed,
        ]}
        accessibilityLabel={isUser ? "Your message" : "Assistant response"}
        accessibilityHint="Long press for options"
      >
        {isUser ? (
          <View>
            {message.attachments && message.attachments.length > 0 ? (
              <View style={styles.attachmentGallery}>
                {message.attachments.map((attachment) => (
                  <View key={attachment.id} style={styles.attachmentThumb}>
                    {attachment.type === "image" ? (
                      <Image source={{ uri: attachment.uri }} style={styles.attachmentThumbImage} />
                    ) : (
                      <View style={styles.attachmentThumbDoc}>
                        <Feather name="file-text" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : null}
            <ThemedText style={[styles.userText, { color: theme.text }]}>{message.content.replace(/\n\[\d+ file\(s\) attached:.*\]$/, "")}</ThemedText>
          </View>
        ) : (
          renderAssistantContent()
        )}
        {message.isStreaming ? (
          <View style={styles.streamingIndicator}>
            <View style={[styles.dot, styles.dot1, { backgroundColor: FireOneColors.orange }]} />
            <View style={[styles.dot, styles.dot2, { backgroundColor: FireOneColors.orange }]} />
            <View style={[styles.dot, styles.dot3, { backgroundColor: FireOneColors.orange }]} />
          </View>
        ) : null}
      </Pressable>
      
      {showActionMenu ? (
        <Pressable 
          style={styles.actionMenuOverlay} 
          onPress={() => setShowActionMenu(false)}
        >
          <View style={[styles.actionMenu, { backgroundColor: theme.backgroundRoot }]}>
            <Pressable 
              style={[styles.actionMenuItem, { borderBottomColor: theme.border }]}
              onPress={handleCopy}
            >
              <Feather name="copy" size={18} color={theme.text} />
              <ThemedText style={[styles.actionMenuText, { color: theme.text }]}>Copy</ThemedText>
            </Pressable>
            {!isUser && message.id > 0 ? (
              <Pressable 
                style={styles.actionMenuItem}
                onPress={handleFavorite}
              >
                <Feather name="bookmark" size={18} color={isFavorite ? FireOneColors.orange : theme.text} />
                <ThemedText style={[styles.actionMenuText, { color: theme.text }]}>
                  {isFavorite ? "Remove Bookmark" : "Bookmark"}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      ) : null}
      
      {isUser ? (
        <View style={[styles.avatarContainer, styles.userAvatarContainer]}>
          <UserAvatar size={32} imageUri={userAvatarUri} name={userName} />
        </View>
      ) : null}
      
      {!isUser && !message.isStreaming && message.id > 0 && onFavoritePress ? (
        <Pressable onPress={handleFavorite} style={styles.favoriteButton}>
          <Feather 
            name={isFavorite ? "bookmark" : "bookmark"} 
            size={16} 
            color={isFavorite ? FireOneColors.orange : theme.textSecondary} 
            style={isFavorite ? { opacity: 1 } : { opacity: 0.5 }}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function parseListItems(rawText: string): string[] {
  const items: string[] = [];
  const lines = rawText.split('\n');
  let currentItem = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (currentItem) {
        items.push(currentItem);
        currentItem = '';
      }
      continue;
    }
    
    const listItemMatch = trimmedLine.match(/^(?:[-•*]|\d+[.)]\s*)/);
    if (listItemMatch) {
      if (currentItem) {
        items.push(currentItem);
      }
      const content = trimmedLine.replace(/^(?:[-•*]|\d+[.)]\s*)/, '').trim();
      currentItem = content;
    } else if (currentItem) {
      currentItem += ' ' + trimmedLine;
    } else {
      currentItem = trimmedLine;
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items
    .map(item => stripMarkdown(item.trim()))
    .filter(item => {
      if (item.length < 3) return false;
      if (/^[.\-*•:,;\s]+$/.test(item)) return false;
      if (/^(?:relevant references|assumptions|next steps|what this means)\*?$/i.test(item)) return false;
      if (/^no (?:action required|specific|significant)/i.test(item)) return false;
      return true;
    });
}

function stripDisclaimerAndNotes(text: string): string {
  return text
    .replace(/\n+\*{0,2}(?:Disclaimer|Important Note|Legal Note)[:\s]*\*{0,2}\n[^]*$/gi, '')
    .replace(/\n+(?:This is not legal advice|This information is for guidance only|Always consult)[^.]*\.?\s*$/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseAssistantContent(content: string): {
  summary?: string;
  references?: string[];
  assumptions?: string[];
  nextSteps?: string[];
} {
  const sections: {
    summary?: string;
    references?: string[];
    assumptions?: string[];
    nextSteps?: string[];
  } = {};

  const cleanedContent = stripDisclaimerAndNotes(content);

  const summaryMatch = cleanedContent.match(/(?:\*{0,2}What this means\*{0,2}|Summary)[:\s]*([^]*?)(?=(?:\*{0,2}Relevant references|References|Assumptions|Next steps|$))/i);
  if (summaryMatch) {
    sections.summary = stripMarkdown(summaryMatch[1].trim());
  }

  const referencesMatch = cleanedContent.match(/(?:\*{0,2}Relevant references\*{0,2}|References)[:\s]*([^]*?)(?=(?:\*{0,2}Assumptions|Next steps|$))/i);
  if (referencesMatch) {
    sections.references = parseListItems(referencesMatch[1]);
  }

  const assumptionsMatch = cleanedContent.match(/\*{0,2}Assumptions\*{0,2}[:\s]*([^]*?)(?=(?:\*{0,2}Next steps|$))/i);
  if (assumptionsMatch) {
    sections.assumptions = parseListItems(assumptionsMatch[1]);
  }

  const nextStepsMatch = cleanedContent.match(/\*{0,2}Next steps\*{0,2}[:\s]*([^]*?)$/i);
  if (nextStepsMatch) {
    let stepsContent = nextStepsMatch[1];
    stepsContent = stepsContent.replace(/(?:\*{0,2}(?:Disclaimer|Note)[:\s]*\*{0,2})[^]*$/i, '');
    sections.nextSteps = parseListItems(stepsContent);
  }

  return sections;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginTop: Spacing.xs,
  },
  userAvatarContainer: {
    marginLeft: Spacing.sm,
  },
  flameContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  flameIcon: {
    width: 20,
    height: 24,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderBottomLeftRadius: Spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
  userText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  assistantContent: {
    gap: Spacing.lg,
  },
  plainContent: {
    fontSize: 15,
    lineHeight: 24,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 24,
  },
  referenceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  referenceIcon: {
    marginTop: 2,
  },
  referenceText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  assumptionsBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  clickableStep: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginHorizontal: -Spacing.md,
  },
  stepPressed: {
    opacity: 0.7,
  },
  stepArrow: {
    marginLeft: "auto",
    marginTop: 4,
  },
  tapHint: {
    fontSize: 11,
    marginLeft: "auto",
    fontStyle: "italic",
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  checklistText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 24,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  disclaimerIcon: {
    marginTop: 1,
  },
  disclaimer: {
    fontSize: 11,
    fontStyle: "italic",
    flex: 1,
    lineHeight: 16,
  },
  streamingIndicator: {
    flexDirection: "row",
    gap: 4,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  dot1: {
    opacity: 1,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.3,
  },
  attachmentGallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  attachmentThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: "hidden",
  },
  attachmentThumbImage: {
    width: "100%",
    height: "100%",
  },
  attachmentThumbDoc: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    padding: 6,
    borderRadius: 12,
  },
  actionMenuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  actionMenu: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  actionMenuText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
