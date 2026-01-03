import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  TextInput,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UserAvatar } from "@/components/UserAvatar";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";

const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 60;
const ANIMATION_DURATION = 300;
const USER_ID_KEY = "@fyreone_user_id";

interface Conversation {
  id: number;
  title: string;
  isStarred?: boolean;
  lastMessageAt?: string;
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  isExpanded?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: number) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenNotebooks: () => void;
  currentConversationId: number | null;
}

interface CollapsibleSectionProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

function CollapsibleSection({ title, icon, isExpanded, onToggle, children, count }: CollapsibleSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.sectionHeaderLeft}>
          <Feather name={icon} size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {title}
          </ThemedText>
          {count !== undefined && count > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: withOpacity(theme.primary, 0.15) }]}>
              <ThemedText style={[styles.countText, { color: theme.primary }]}>
                {count}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <Feather
          name={isExpanded ? "chevron-down" : "chevron-right"}
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>
      {isExpanded ? <View style={styles.sectionContent}>{children}</View> : null}
    </View>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}

function ConversationItem({ conversation, isSelected, onSelect, onLongPress }: ConversationItemProps) {
  const { theme, isDark } = useTheme();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.conversationItem,
        {
          backgroundColor: isSelected
            ? withOpacity(theme.primary, 0.15)
            : pressed
            ? theme.backgroundSecondary
            : "transparent",
        },
      ]}
    >
      <View style={styles.conversationContent}>
        <View style={styles.conversationTitleRow}>
          <ThemedText
            style={[styles.conversationTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {conversation.title}
          </ThemedText>
          {conversation.isStarred ? (
            <Feather name="star" size={12} color={FireOneColors.orange} style={{ marginLeft: 4 }} />
          ) : null}
        </View>
        <ThemedText style={[styles.conversationDate, { color: theme.textSecondary }]}>
          {formatDate(conversation.lastMessageAt || conversation.createdAt)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function Sidebar({
  isOpen,
  onClose,
  onNewChat,
  onSelectConversation,
  onOpenSearch,
  onOpenSettings,
  onOpenNotebooks,
  currentConversationId,
}: SidebarProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const queryClient = useQueryClient();

  const isDesktop = windowWidth >= 768;
  const [userId, setUserId] = useState<string | null>(null);
  const [favouritesExpanded, setFavouritesExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [notebooksExpanded, setNotebooksExpanded] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(USER_ID_KEY).then((id) => setUserId(id));
  }, []);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, overlayOpacity]);

  const { data: starredConversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations/starred", userId],
    enabled: !!userId,
  });

  const { data: recentConversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations/recent", userId],
    enabled: !!userId,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", userId],
    enabled: !!userId,
  });

  const starMutation = useMutation({
    mutationFn: async ({ conversationId, isStarred }: { conversationId: number; isStarred: boolean }) => {
      await apiRequest("PUT", `/api/conversations/${conversationId}/star`, { isStarred });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/starred"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/recent"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: number; title: string }) => {
      await apiRequest("PUT", `/api/conversations/${conversationId}/rename`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/starred"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/recent"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/starred"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/recent"] });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/projects", { userId, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowNewProjectModal(false);
      setNewProjectName("");
    },
  });

  const addToProjectMutation = useMutation({
    mutationFn: async ({ projectId, conversationId }: { projectId: number; conversationId: number }) => {
      await apiRequest("POST", `/api/projects/${projectId}/conversations`, { conversationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowProjectPicker(false);
    },
  });

  const handleConversationLongPress = (conversation: Conversation) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedConversation(conversation);
    setShowContextMenu(true);
  };

  const handleRename = () => {
    if (selectedConversation) {
      setRenameText(selectedConversation.title);
      setShowContextMenu(false);
      setShowRenameModal(true);
    }
  };

  const handleRenameSubmit = () => {
    if (selectedConversation && renameText.trim()) {
      renameMutation.mutate({ conversationId: selectedConversation.id, title: renameText.trim() });
      setShowRenameModal(false);
      setSelectedConversation(null);
    }
  };

  const handleToggleStar = () => {
    if (selectedConversation) {
      starMutation.mutate({
        conversationId: selectedConversation.id,
        isStarred: !selectedConversation.isStarred,
      });
      setShowContextMenu(false);
      setSelectedConversation(null);
    }
  };

  const handleMoveToProject = () => {
    setShowContextMenu(false);
    setShowProjectPicker(true);
  };

  const handleDelete = () => {
    if (selectedConversation) {
      Alert.alert(
        "Delete Conversation",
        "Are you sure you want to delete this conversation?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteMutation.mutate(selectedConversation.id);
              setShowContextMenu(false);
              setSelectedConversation(null);
            },
          },
        ]
      );
    }
  };

  const handleSelectConversation = (conversationId: number) => {
    onSelectConversation(conversationId);
    if (!isDesktop) {
      onClose();
    }
  };

  const handleExport = async () => {
    if (!selectedConversation) return;
    setShowContextMenu(false);

    try {
      const res = await fetch(new URL(`/api/conversations/${selectedConversation.id}/export`, getApiUrl()).toString());
      if (!res.ok) throw new Error("Export failed");
      const markdown = await res.text();

      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(markdown);
        Alert.alert("Copied", "Conversation copied to clipboard as Markdown.");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare && FileSystem.documentDirectory) {
          const fileUri = FileSystem.documentDirectory + `conversation-${selectedConversation.id}.md`;
          await FileSystem.writeAsStringAsync(fileUri, markdown);
          await Sharing.shareAsync(fileUri, { mimeType: "text/markdown", dialogTitle: "Export Conversation" });
        } else {
          await Clipboard.setStringAsync(markdown);
          Alert.alert("Copied", "Conversation copied to clipboard as Markdown.");
        }
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not export the conversation. Please try again.");
    }
    setSelectedConversation(null);
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate(newProjectName.trim());
    }
  };

  const sidebarContent = (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: theme.backgroundRoot,
          borderRightColor: theme.border,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.sidebarHeader}>
        <Pressable
          onPress={() => {
            onNewChat();
            if (!isDesktop) onClose();
          }}
          style={({ pressed }) => [
            styles.newChatButton,
            { backgroundColor: FireOneColors.orange },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <ThemedText style={styles.newChatText}>New Chat</ThemedText>
        </Pressable>

        {!isDesktop ? (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          onOpenSearch();
          if (!isDesktop) onClose();
        }}
        style={({ pressed }) => [
          styles.searchButton,
          { backgroundColor: theme.backgroundSecondary },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Feather name="search" size={16} color={theme.textSecondary} />
        <ThemedText style={[styles.searchText, { color: theme.textSecondary }]}>
          Search conversations...
        </ThemedText>
      </Pressable>

      <ScrollView
        style={styles.sidebarScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
      >
        <CollapsibleSection
          title="Favourites"
          icon="star"
          isExpanded={favouritesExpanded}
          onToggle={() => setFavouritesExpanded(!favouritesExpanded)}
          count={starredConversations.length}
        >
          {starredConversations.length > 0 ? (
            starredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={currentConversationId === conv.id}
                onSelect={() => handleSelectConversation(conv.id)}
                onLongPress={() => handleConversationLongPress(conv)}
              />
            ))
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No favourites yet
            </ThemedText>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Recent"
          icon="clock"
          isExpanded={recentExpanded}
          onToggle={() => setRecentExpanded(!recentExpanded)}
          count={recentConversations.length}
        >
          {recentConversations.length > 0 ? (
            recentConversations.slice(0, 10).map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={currentConversationId === conv.id}
                onSelect={() => handleSelectConversation(conv.id)}
                onLongPress={() => handleConversationLongPress(conv)}
              />
            ))
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No recent conversations
            </ThemedText>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Projects"
          icon="folder"
          isExpanded={projectsExpanded}
          onToggle={() => setProjectsExpanded(!projectsExpanded)}
          count={projects.length}
        >
          {projects.length > 0 ? (
            projects.map((project) => (
              <Pressable
                key={project.id}
                style={({ pressed }) => [
                  styles.projectItem,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="folder" size={14} color={project.color || FireOneColors.orange} />
                <ThemedText style={[styles.projectName, { color: theme.text }]} numberOfLines={1}>
                  {project.name}
                </ThemedText>
              </Pressable>
            ))
          ) : null}
          <Pressable
            onPress={() => setShowNewProjectModal(true)}
            style={({ pressed }) => [
              styles.addProjectButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="plus" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.addProjectText, { color: theme.textSecondary }]}>
              New Project
            </ThemedText>
          </Pressable>
        </CollapsibleSection>

        <CollapsibleSection
          title="Notebooks"
          icon="book"
          isExpanded={notebooksExpanded}
          onToggle={() => setNotebooksExpanded(!notebooksExpanded)}
        >
          <Pressable
            onPress={() => {
              onOpenNotebooks();
              if (!isDesktop) onClose();
            }}
            style={({ pressed }) => [
              styles.addProjectButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="book-open" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.addProjectText, { color: theme.textSecondary }]}>
              View Notebooks
            </ThemedText>
          </Pressable>
        </CollapsibleSection>
      </ScrollView>

      <View style={[styles.sidebarFooter, { borderTopColor: theme.border }]}>
        <Pressable
          onPress={() => {
            onOpenSettings();
            if (!isDesktop) onClose();
          }}
          style={({ pressed }) => [
            styles.footerItem,
            pressed && { opacity: 0.7 },
          ]}
        >
          <UserAvatar size={32} />
          <View style={styles.footerUserInfo}>
            <ThemedText style={[styles.footerUserName, { color: theme.text }]}>
              Profile & Settings
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowContextMenu(false)}
        >
          <View style={[styles.contextMenu, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText style={[styles.contextMenuTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedConversation?.title}
            </ThemedText>

            <Pressable
              onPress={handleRename}
              style={({ pressed }) => [
                styles.contextMenuItem,
                { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
              ]}
            >
              <Feather name="edit-2" size={18} color={theme.text} />
              <ThemedText style={[styles.contextMenuText, { color: theme.text }]}>
                Rename
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleToggleStar}
              style={({ pressed }) => [
                styles.contextMenuItem,
                { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
              ]}
            >
              <Feather
                name={selectedConversation?.isStarred ? "star" : "star"}
                size={18}
                color={selectedConversation?.isStarred ? FireOneColors.orange : theme.text}
              />
              <ThemedText style={[styles.contextMenuText, { color: theme.text }]}>
                {selectedConversation?.isStarred ? "Remove from Favourites" : "Add to Favourites"}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleMoveToProject}
              style={({ pressed }) => [
                styles.contextMenuItem,
                { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
              ]}
            >
              <Feather name="folder-plus" size={18} color={theme.text} />
              <ThemedText style={[styles.contextMenuText, { color: theme.text }]}>
                Move to Project
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleExport}
              style={({ pressed }) => [
                styles.contextMenuItem,
                { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
              ]}
            >
              <Feather name="download" size={18} color={theme.text} />
              <ThemedText style={[styles.contextMenuText, { color: theme.text }]}>
                Export to Markdown
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.contextMenuItem,
                { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
              ]}
            >
              <Feather name="trash-2" size={18} color="#EF4444" />
              <ThemedText style={[styles.contextMenuText, { color: "#EF4444" }]}>
                Delete
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRenameModal(false)}
        >
          <View style={[styles.renameModal, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText style={[styles.renameTitle, { color: theme.text }]}>
              Rename Conversation
            </ThemedText>
            <TextInput
              style={[
                styles.renameInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new title"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.renameButtons}>
              <Pressable
                onPress={() => setShowRenameModal(false)}
                style={[styles.renameButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleRenameSubmit}
                style={[styles.renameButton, { backgroundColor: FireOneColors.orange }]}
              >
                <ThemedText style={{ color: "#FFFFFF" }}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showProjectPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProjectPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProjectPicker(false)}
        >
          <View style={[styles.contextMenu, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText style={[styles.contextMenuTitle, { color: theme.text }]}>
              Move to Project
            </ThemedText>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  if (selectedConversation) {
                    addToProjectMutation.mutate({
                      projectId: project.id,
                      conversationId: selectedConversation.id,
                    });
                  }
                }}
                style={({ pressed }) => [
                  styles.contextMenuItem,
                  { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
                ]}
              >
                <Feather name="folder" size={18} color={project.color || FireOneColors.orange} />
                <ThemedText style={[styles.contextMenuText, { color: theme.text }]}>
                  {project.name}
                </ThemedText>
              </Pressable>
            ))}
            {projects.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary, padding: Spacing.md }]}>
                No projects yet. Create one first.
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showNewProjectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewProjectModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowNewProjectModal(false)}
          >
            <Pressable onPress={() => {}}>
              <View style={[styles.renameModal, { backgroundColor: theme.backgroundRoot }]}>
                <ThemedText style={[styles.renameTitle, { color: theme.text }]}>
                  New Project
                </ThemedText>
                <TextInput
                  style={[
                    styles.renameInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                  placeholder="Project name"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                />
                <View style={styles.renameButtons}>
                  <Pressable
                    onPress={() => setShowNewProjectModal(false)}
                    style={[styles.renameButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleCreateProject}
                    style={[styles.renameButton, { backgroundColor: FireOneColors.orange }]}
                  >
                    <ThemedText style={{ color: "#FFFFFF" }}>Create</ThemedText>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );

  if (!isOpen && !isDesktop) {
    return null;
  }

  if (isDesktop) {
    return isOpen ? sidebarContent : null;
  }

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.mobileContainer}>
        <Animated.View
          style={[
            styles.mobileOverlay,
            { opacity: overlayOpacity },
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.mobileSidebar,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {sidebarContent}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    flexDirection: "row",
  },
  mobileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  mobileSidebar: {
    width: SIDEBAR_WIDTH,
    height: "100%",
  },
  sidebar: {
    flex: 1,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  newChatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  newChatText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  searchText: {
    fontSize: 14,
  },
  sidebarScroll: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.xs,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sectionContent: {
    paddingHorizontal: Spacing.sm,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: 2,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  conversationDate: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  projectName: {
    fontSize: 14,
    flex: 1,
  },
  addProjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  addProjectText: {
    fontSize: 14,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    padding: Spacing.md,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  footerUserInfo: {
    flex: 1,
  },
  footerUserName: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  contextMenu: {
    width: 280,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contextMenuTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  contextMenuText: {
    fontSize: 15,
  },
  renameModal: {
    width: 300,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  renameButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  renameButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
});
