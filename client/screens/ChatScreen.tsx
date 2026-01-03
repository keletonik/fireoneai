import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  Text,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, FireOneColors, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { MessageBubble, Message } from "@/components/MessageBubble";
import { InputComposer, Attachment } from "@/components/InputComposer";
import { ThemedText } from "@/components/ThemedText";
import { LoadingSquares } from "@/components/LoadingSquares";
import { VoiceInput, speakText } from "@/components/VoiceInput";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { SlashCommand, SLASH_COMMANDS, parseSlashCommand } from "@/lib/commands";
import { FyreOneWordmark } from "@/components/FyreOneWordmark";
import { Sidebar } from "@/components/Sidebar";
import { SaveToNotebookModal } from "@/components/SaveToNotebookModal";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  messages?: Message[];
}

const STORAGE_KEYS = {
  FIRST_LOGIN: "@fyreone_first_login",
  VOICE_ENABLED: "@fyreone_voice_enabled",
  MEMORY_ENABLED: "@fyreone_memory_enabled",
  AI_TONE: "@fyreone_ai_tone",
  AI_INSTRUCTIONS: "@fyreone_ai_instructions",
  USER_NAME: "user_name",
  USER_AVATAR: "user_avatar_uri",
  UPLOADED_FILES: "@fyreone_uploaded_files",
};

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uri: string;
  uploadedAt: string;
  content?: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(true);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [userAvatarUri, setUserAvatarUri] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [prefillText, setPrefillText] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveToNotebookMessage, setSaveToNotebookMessage] = useState<Message | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDocumentContent = async (file: UploadedFile): Promise<UploadedFile> => {
    try {
      if (Platform.OS === "web") {
        return { ...file, content: `[Document: ${file.name} - ${file.type}]` };
      }
      
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists) {
        return { ...file, content: `[File no longer available: ${file.name}]` };
      }
      
      if (file.type.startsWith("text/") || file.type === "application/json") {
        const content = await FileSystem.readAsStringAsync(file.uri);
        return { ...file, content: content.substring(0, 10000) };
      }
      if (file.type === "application/pdf") {
        return { ...file, content: `[PDF Document: ${file.name}]` };
      }
      if (file.type.startsWith("image/")) {
        return { ...file, content: `[Image: ${file.name}]` };
      }
      return { ...file, content: `[Document: ${file.name}]` };
    } catch (error) {
      console.error("Error reading file:", file.name, error);
      return { ...file, content: `[Document: ${file.name}]` };
    }
  };

  const loadUploadedDocuments = useCallback(async () => {
    try {
      const filesJson = await AsyncStorage.getItem(STORAGE_KEYS.UPLOADED_FILES);
      if (filesJson) {
        const files: UploadedFile[] = JSON.parse(filesJson);
        const filesWithContent = await Promise.all(
          files.map(f => loadDocumentContent(f).catch(() => ({ ...f, content: `[Document: ${f.name}]` })))
        );
        setUploadedFiles(filesWithContent);
      } else {
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error("Error loading uploaded documents:", error);
      setUploadedFiles([]);
    }
  }, []);

  const loadUserProfile = useCallback(() => {
    const loadAsync = async () => {
      try {
        const [avatar, name] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_AVATAR),
          AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
        ]);
        setUserAvatarUri(avatar);
        setUserName(name);
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };
    loadAsync();
  }, []);

  useEffect(() => {
    checkFirstLogin();
    loadUserProfile();
    loadUploadedDocuments();
  }, [loadUserProfile, loadUploadedDocuments]);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      loadUploadedDocuments();
    }, [loadUserProfile, loadUploadedDocuments])
  );

  const checkFirstLogin = async () => {
    try {
      const hasLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LOGIN);
      if (hasLoggedIn) {
        setIsFirstLogin(false);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LOGIN, "true");
        setIsFirstLogin(true);
      }
    } catch (error) {
      console.error("Error checking first login:", error);
    }
  };

  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/conversations", { title });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      return data;
    },
    onError: (error) => {
      setErrorMessage("Failed to start conversation. Please try again.");
      console.error("Error creating conversation:", error);
    },
  });

  const sendMessage = useCallback(async (content: string, command?: SlashCommand, attachments?: Attachment[]) => {
    setErrorMessage(null);
    
    const { command: parsedCommand, query } = parseSlashCommand(content);
    const effectiveCommand = command || parsedCommand;
    
    if (effectiveCommand && effectiveCommand.id === "help") {
      setShowHelpModal(true);
      return;
    }

    if (effectiveCommand) {
      setActiveCommand(effectiveCommand);
    }
    
    let convId = currentConversationId;

    if (!convId) {
      try {
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        const newConv = await createConversationMutation.mutateAsync(title);
        convId = newConv.id;
        setCurrentConversationId(convId);
      } catch {
        return;
      }
    }

    const displayContent = query || content;
    const attachmentInfo = attachments && attachments.length > 0 
      ? `\n[${attachments.length} file(s) attached: ${attachments.map(a => a.name).join(", ")}]` 
      : "";

    const tempMessageId = Date.now();
    const userMessage: Message = {
      id: tempMessageId,
      role: "user",
      content: displayContent + attachmentInfo,
      createdAt: new Date().toISOString(),
      attachments: attachments?.map(a => ({
        id: a.id,
        uri: a.uri,
        name: a.name,
        type: a.type,
        mimeType: a.mimeType,
      })),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingMessage("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    const rollbackUserMessage = () => {
      setMessages(prev => prev.filter(m => m.id !== tempMessageId));
    };

    try {
      const [memoryEnabledStr, aiTone, aiInstructions] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MEMORY_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.AI_TONE),
        AsyncStorage.getItem(STORAGE_KEYS.AI_INSTRUCTIONS),
      ]);

      const memoryEnabled = memoryEnabledStr === null ? true : memoryEnabledStr === "true";

      const baseUrl = getApiUrl();
      const url = new URL(`/api/conversations/${convId}/messages`, baseUrl);
      
      const useStreaming = Platform.OS === "web";
      
      const requestBody: any = { 
        content: displayContent,
        memoryEnabled,
        tone: aiTone || "professional",
        customInstructions: aiInstructions || undefined,
        noStream: !useStreaming,
      };
      
      if (attachments && attachments.length > 0) {
        const attachmentDataList = await Promise.all(
          attachments.map(async (attachment) => {
            const attachmentData: any = {
              id: attachment.id,
              name: attachment.name,
              type: attachment.type,
              mimeType: attachment.mimeType,
            };
            
            try {
              if (attachment.type === "image") {
                const base64 = await FileSystem.readAsStringAsync(attachment.uri, {
                  encoding: "base64",
                });
                attachmentData.base64 = base64;
              } else if (attachment.type === "document") {
                try {
                  const textContent = await FileSystem.readAsStringAsync(attachment.uri, {
                    encoding: "utf8",
                  });
                  attachmentData.textContent = textContent;
                } catch {
                  attachmentData.textContent = `[Unable to read document: ${attachment.name}]`;
                }
              }
            } catch (err) {
              console.error("Error reading attachment:", err);
            }
            
            return attachmentData;
          })
        );
        
        requestBody.attachments = attachmentDataList;
      }
      
      let systemContext = "";
      
      if (effectiveCommand && effectiveCommand.systemPrompt) {
        systemContext += effectiveCommand.systemPrompt;
        requestBody.commandId = effectiveCommand.id;
      }
      
      if (uploadedFiles.length > 0) {
        const docsContext = uploadedFiles.map(f => {
          if (f.content && !f.content.startsWith("[")) {
            return `=== Document: ${f.name} ===\n${f.content}\n=== End of ${f.name} ===`;
          }
          return `[Uploaded file: ${f.name} (${f.type})]`;
        }).join("\n\n");
        
        systemContext += `\n\n=== USER'S UPLOADED DOCUMENTS ===\nThe user has uploaded the following reference documents. You can refer to their content when answering questions:\n\n${docsContext}\n\n=== END OF UPLOADED DOCUMENTS ===`;
      }
      
      if (systemContext.trim()) {
        requestBody.systemContext = systemContext;
      }
      
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      let fullContent = "";
      let hasError = false;

      if (useStreaming && response.body?.getReader) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamComplete = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  hasError = true;
                  setErrorMessage(data.error);
                  break;
                }
                if (data.content) {
                  fullContent += data.content;
                  setStreamingMessage(fullContent);
                }
                if (data.done) {
                  streamComplete = true;
                }
              } catch {
              }
            }
          }
          
          if (hasError) break;
        }

        if (streamComplete && fullContent) {
          const assistantMessage: Message = {
            id: Date.now() + 1,
            role: "assistant",
            content: fullContent,
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        const data = await response.json();
        
        if (data.error) {
          hasError = true;
          setErrorMessage(data.error);
        } else if (data.content) {
          fullContent = data.content;
          const assistantMessage: Message = {
            id: Date.now() + 1,
            role: "assistant",
            content: fullContent,
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
      
      setStreamingMessage("");
      setIsStreaming(false);
      setActiveCommand(null);

      if (!fullContent && !hasError) {
        throw new Error("No response received from assistant");
      }

    } catch (error) {
      console.error("Error sending message:", error);
      setIsStreaming(false);
      setStreamingMessage("");
      setActiveCommand(null);
      rollbackUserMessage();
      setErrorMessage("Failed to send message. Please try again.");
    }

    queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId?.toString()] });
  }, [currentConversationId, createConversationMutation, queryClient]);

  const handleNextStepPress = useCallback((step: string) => {
    const contextualQuery = `Tell me more about: ${step}`;
    sendMessage(contextualQuery);
  }, [sendMessage]);

  // Helper to check if message ID is a valid persisted database ID
  const isPersistedMessageId = useCallback((messageId: number): boolean => {
    const MAX_DB_INT = 2147483647;
    return messageId > 0 && messageId <= MAX_DB_INT;
  }, []);

  const handleFavoritePress = useCallback(async (messageId: number): Promise<boolean> => {
    if (!isPersistedMessageId(messageId)) {
      console.log("Skipping favorite for temporary message:", messageId);
      return false;
    }
    
    try {
      const url = new URL(`/api/messages/${messageId}/favorite`, getApiUrl());
      const response = await fetch(url.toString(), { method: "POST" });
      if (!response.ok) {
        console.error("Failed to toggle favorite:", response.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error toggling favorite:", error);
      return false;
    }
  }, [isPersistedMessageId]);

  const handleFeedback = useCallback(async (messageId: number, type: "positive" | "negative"): Promise<boolean> => {
    if (!isPersistedMessageId(messageId)) {
      console.log("Skipping feedback for temporary message:", messageId);
      return false;
    }
    
    try {
      const url = new URL(`/api/feedback/messages/${messageId}`, getApiUrl());
      const response = await fetch(url.toString(), { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rating: type === "positive" ? 1 : -1,
          feedbackType: "rating",
          userId: null
        })
      });
      if (!response.ok) {
        console.error("Failed to submit feedback:", response.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error submitting feedback:", error);
      return false;
    }
  }, [isPersistedMessageId]);

  const handleExportPDF = useCallback(async () => {
    if (messages.length === 0) {
      return;
    }
    
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; }
            .message { margin: 15px 0; padding: 15px; border-radius: 8px; }
            .user { background: #FF6B35; color: white; margin-left: 50px; }
            .assistant { background: #f5f5f5; border: 1px solid #e0e0e0; margin-right: 50px; }
            .role { font-weight: bold; font-size: 12px; margin-bottom: 8px; }
            .content { line-height: 1.6; }
            .footer { margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>FyreOne AI - Compliance Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          ${messages.map(m => `
            <div class="message ${m.role}">
              <div class="role">${m.role === "user" ? "You" : "FyreOne AI"}</div>
              <div class="content">${m.content.replace(/\n/g, "<br>")}</div>
            </div>
          `).join("")}
          <div class="footer">
            This report was generated by FyreOne AI. Not legal advice - verify against current NCC/standards.
          </div>
        </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  }, [messages]);

  const handleVoicePress = useCallback(() => {
    setShowVoiceModal(true);
  }, []);

  const handleVoiceTranscript = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const startNewConversation = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentConversationId(null);
    setMessages([]);
    setStreamingMessage("");
    setErrorMessage(null);
    setActiveCommand(null);
  }, []);

  const loadConversation = useCallback(async (conversationId: number) => {
    try {
      setCurrentConversationId(conversationId);
      setMessages([]);
      setStreamingMessage("");
      setErrorMessage(null);
      
      const baseUrl = getApiUrl();
      const url = new URL(`/api/conversations/${conversationId}/messages`, baseUrl);
      const res = await fetch(url.toString());
      
      if (!res.ok) {
        throw new Error("Failed to load conversation");
      }
      
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading conversation:", error);
      setErrorMessage("Failed to load conversation. Please try again.");
    }
  }, []);

  const handlePrefillConsumed = useCallback(() => {
    setPrefillText(undefined);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!currentConversationId) return;
    setIsRefreshing(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/conversations/${currentConversationId}/messages`, baseUrl);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentConversationId]);

  const handleSendWithPrefillClear = useCallback((msg: string, cmd?: SlashCommand, attachments?: Attachment[]) => {
    sendMessage(msg, cmd, attachments);
    setPrefillText(undefined);
  }, [sendMessage]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isLastAssistantMessage = item.role === "assistant" && index === messages.length - 1 && !isStreaming;
    return (
      <MessageBubble 
        message={item} 
        onNextStepPress={isLastAssistantMessage ? handleNextStepPress : undefined}
        onFavoritePress={handleFavoritePress}
        onSaveToNotebook={(msg) => setSaveToNotebookMessage(msg)}
        onFeedback={handleFeedback}
        userAvatarUri={userAvatarUri}
        userName={userName}
      />
    );
  };


  const FIRE_TOPICS = [
    { label: "Fire Indicating Panels", icon: "cpu", placeholder: 'e.g., "What does a FIP general fault mean?"' },
    { label: "Fire Hydrants", icon: "droplet", placeholder: 'e.g., "What are the testing requirements for hydrants?"' },
    { label: "Fire Doors", icon: "log-in", placeholder: 'e.g., "How often do fire doors need inspection?"' },
    { label: "Smoke Alarms", icon: "alert-circle", placeholder: 'e.g., "What are the AS3786 requirements?"' },
    { label: "Sprinkler Systems", icon: "cloud-rain", placeholder: 'e.g., "What are the AS2118 testing requirements?"' },
    { label: "Portables (FE + FB + FHR)", icon: "shield", placeholder: 'e.g., "How often do extinguishers need servicing?"', description: "Fire extinguishers, fire blankets & fire hose reels" },
  ];

  const [topicPlaceholder, setTopicPlaceholder] = useState<string | undefined>(undefined);

  const handleTopicSelect = useCallback(async (topic: string, placeholder?: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setPrefillText(`${topic}: `);
    setTopicPlaceholder(placeholder);
  }, []);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {messages.length === 0 && !isStreaming ? (
        <View style={styles.welcomeContainer}>
          <ThemedText style={styles.welcomeTitle}>
            Welcome to <Text style={{ color: FireOneColors.orange }}>Fyre</Text>One AI
          </ThemedText>
          <ThemedText style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Your NSW fire safety compliance assistant. Ask questions about AFSS, NCC/BCA provisions, or Australian Standards.
          </ThemedText>
          
          <View style={styles.quickPromptsContainer}>
            <ThemedText style={[styles.quickPromptsLabel, { color: theme.textSecondary }]}>
              What's your fire-related enquiry about?
            </ThemedText>
            <View style={styles.quickPromptsGrid}>
              {FIRE_TOPICS.map((topic, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleTopicSelect(topic.label, topic.placeholder)}
                  style={({ pressed }) => [
                    styles.quickPromptChip,
                    { backgroundColor: isDark ? theme.backgroundSecondary : theme.backgroundDefault },
                    pressed && styles.pressed
                  ]}
                  accessibilityLabel={topic.label}
                  accessibilityHint={topic.description ? `${topic.description}. Tap to select this topic` : "Tap to select this topic"}
                >
                  <Feather name={topic.icon as any} size={14} color={FireOneColors.orange} />
                  <ThemedText style={[styles.quickPromptText, { color: theme.text }]}>
                    {topic.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
          
          <View style={styles.tipContainer}>
            <View style={[styles.tipBadge, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="zap" size={14} color={FireOneColors.orange} />
              <ThemedText style={[styles.tipText, { color: theme.textSecondary }]}>
                Type <ThemedText style={{ color: FireOneColors.orange, fontWeight: "600" }}>/help</ThemedText> to see available commands
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.listFooter}>
      {isStreaming && streamingMessage ? (
        <MessageBubble
          message={{
            id: -1,
            role: "assistant",
            content: streamingMessage,
            isStreaming: true,
          }}
          userAvatarUri={userAvatarUri}
          userName={userName}
        />
      ) : null}
      {isStreaming && !streamingMessage ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.assistantBubble }]}>
          <LoadingSquares size="small" />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            {activeCommand ? `Processing ${activeCommand.name}...` : "FyreOne is thinking..."}
          </ThemedText>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      ) : null}
    </View>
  );

  const renderHelpModal = () => (
    showHelpModal ? (
      <Pressable 
        style={styles.helpOverlay} 
        onPress={() => setShowHelpModal(false)}
      >
        <View 
          style={[styles.helpModal, { backgroundColor: theme.backgroundRoot }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.helpHeader}>
            <ThemedText style={styles.helpTitle}>Available Commands</ThemedText>
            <Pressable onPress={() => setShowHelpModal(false)}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={SLASH_COMMANDS.filter(cmd => cmd.id !== "help")}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setShowHelpModal(false);
                  sendMessage(item.name + " ");
                }}
                style={[styles.helpItem, { borderBottomColor: theme.border }]}
              >
                <View style={[styles.helpItemIcon, { backgroundColor: FireOneColors.orange + "15" }]}>
                  <Feather name={item.icon as any} size={18} color={FireOneColors.orange} />
                </View>
                <View style={styles.helpItemInfo}>
                  <ThemedText style={styles.helpItemName}>{item.name}</ThemedText>
                  <ThemedText style={[styles.helpItemDesc, { color: theme.textSecondary }]}>
                    {item.description}
                  </ThemedText>
                </View>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Pressable>
    ) : null
  );

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={startNewConversation}
        onSelectConversation={loadConversation}
        onOpenSearch={() => navigation.navigate("Search")}
        onOpenSettings={() => navigation.navigate("Settings")}
        onOpenNotebooks={() => navigation.navigate("Notebooks")}
        currentConversationId={currentConversationId}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: theme.backgroundRoot, borderBottomColor: isDark ? theme.border : "rgba(0,0,0,0.05)" }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setSidebarOpen(!sidebarOpen);
                }}
                style={({ pressed }) => [styles.headerButton, { backgroundColor: theme.backgroundSecondary }, pressed && styles.pressed]}
                accessibilityLabel="Open menu"
                accessibilityRole="button"
              >
                <Feather name="menu" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            <FyreOneWordmark height={28} isDark={isDark} />
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => navigation.navigate("Search")}
                style={({ pressed }) => [styles.headerButton, { backgroundColor: theme.backgroundSecondary }, pressed && styles.pressed]}
                accessibilityLabel="Search conversations"
                accessibilityRole="button"
              >
                <Feather name="search" size={20} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  navigation.navigate("Settings");
                }}
                style={({ pressed }) => [styles.headerButton, { backgroundColor: theme.backgroundSecondary }, pressed && styles.pressed]}
                accessibilityLabel="Open settings"
                accessibilityRole="button"
              >
                <Feather name="settings" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

      <FlatList
        ref={flatListRef}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageListContent,
          { paddingBottom: Spacing.xl },
        ]}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onContentSizeChange={() => {
          if (messages.length > 0 || isStreaming) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        removeClippedSubviews={false}
        refreshControl={
          currentConversationId ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={FireOneColors.orange}
              colors={[FireOneColors.orange]}
            />
          ) : undefined
        }
      />

      <View style={{ paddingBottom: insets.bottom }}>
        <InputComposer 
          onSend={handleSendWithPrefillClear} 
          onVoicePress={handleVoicePress}
          disabled={isStreaming || createConversationMutation.isPending}
          showVoiceButton={true}
          prefillText={prefillText}
          onPrefillConsumed={handlePrefillConsumed}
          placeholder={topicPlaceholder || "Ask a fire safety compliance question..."}
        />
      </View>

      <VoiceInput
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onTranscript={handleVoiceTranscript}
      />

      <SaveToNotebookModal
        visible={saveToNotebookMessage !== null}
        onClose={() => setSaveToNotebookMessage(null)}
        message={saveToNotebookMessage}
        conversationId={currentConversationId}
      />

      {renderHelpModal()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  headerRight: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    flexGrow: 1,
  },
  listHeader: {
    paddingTop: 0,
  },
  listFooter: {
    paddingBottom: Spacing.md,
  },
  animationContainer: {
    width: "100%",
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  welcomeContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing["2xl"],
    overflow: "visible",
    width: "100%",
  },
  welcomeLogo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.lg,
  },
  welcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  tipContainer: {
    marginTop: Spacing.md,
  },
  tipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tipText: {
    fontSize: 13,
  },
  quickPromptsContainer: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  quickPromptsLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  quickPromptsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  quickPromptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  quickPromptText: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    alignSelf: "flex-start",
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: "#E55A2B",
    textAlign: "center",
  },
  helpOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  helpModal: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  helpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  helpItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  helpItemInfo: {
    flex: 1,
  },
  helpItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  helpItemDesc: {
    fontSize: 13,
    marginTop: 2,
  },
});
