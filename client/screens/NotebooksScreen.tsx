import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

const USER_ID_KEY = "@fyreone_user_id";

interface Notebook {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Snippet {
  id: number;
  notebookId: number;
  conversationId?: number;
  messageId?: number;
  content: string;
  title?: string;
  notes?: string;
  tags?: string[];
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export default function NotebooksScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookDescription, setNewNotebookDescription] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(USER_ID_KEY).then((id) => setUserId(id));
  }, []);

  const { data: notebooks = [], isLoading } = useQuery<Notebook[]>({
    queryKey: ["/api/notebooks", userId],
    enabled: !!userId,
  });

  const { data: snippets = [] } = useQuery<Snippet[]>({
    queryKey: ["/api/notebooks", selectedNotebook?.id, "snippets"],
    enabled: !!selectedNotebook,
  });

  const createNotebookMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      await apiRequest("POST", "/api/notebooks", { userId, name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks"] });
      setShowNewNotebookModal(false);
      setNewNotebookName("");
      setNewNotebookDescription("");
    },
  });

  const updateNotebookMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description?: string }) => {
      await apiRequest("PUT", `/api/notebooks/${id}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks"] });
      setShowEditModal(false);
    },
  });

  const deleteNotebookMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notebooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks"] });
      setSelectedNotebook(null);
    },
  });

  const deleteSnippetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notebooks/snippets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks", selectedNotebook?.id, "snippets"] });
    },
  });

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      createNotebookMutation.mutate({
        name: newNotebookName.trim(),
        description: newNotebookDescription.trim() || undefined,
      });
    }
  };

  const handleEditNotebook = () => {
    if (selectedNotebook && editName.trim()) {
      updateNotebookMutation.mutate({
        id: selectedNotebook.id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
    }
  };

  const handleDeleteNotebook = (notebook: Notebook) => {
    Alert.alert(
      "Delete Notebook",
      `Are you sure you want to delete "${notebook.name}"? All snippets will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteNotebookMutation.mutate(notebook.id),
        },
      ]
    );
  };

  const handleExportNotebook = async () => {
    if (!selectedNotebook) return;

    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/notebooks/${selectedNotebook.id}/export`, baseUrl);
      const res = await fetch(url.toString());
      const data = await res.json();

      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(data.markdown);
        Alert.alert("Exported", "Notebook copied to clipboard as Markdown");
      } else {
        const filename = `${selectedNotebook.name.replace(/[^a-zA-Z0-9-_]/g, "-")}.md`;
        const filePath = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(filePath, data.markdown);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        }
      }
    } catch (error) {
      console.error("Error exporting notebook:", error);
      Alert.alert("Error", "Failed to export notebook");
    }
  };

  const handleCopySnippet = async (snippet: Snippet) => {
    await Clipboard.setStringAsync(snippet.content);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteSnippet = (snippet: Snippet) => {
    Alert.alert(
      "Delete Snippet",
      "Are you sure you want to delete this snippet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSnippetMutation.mutate(snippet.id),
        },
      ]
    );
  };

  const renderNotebookItem = ({ item }: { item: Notebook }) => (
    <Pressable
      onPress={() => setSelectedNotebook(item)}
      onLongPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setEditName(item.name);
        setEditDescription(item.description || "");
        setSelectedNotebook(item);
        setShowEditModal(true);
      }}
      style={({ pressed }) => [
        styles.notebookCard,
        {
          backgroundColor: selectedNotebook?.id === item.id
            ? withOpacity(theme.primary, 0.15)
            : theme.backgroundSecondary,
          borderColor: selectedNotebook?.id === item.id ? theme.primary : theme.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.notebookIcon, { backgroundColor: withOpacity(item.color || FireOneColors.orange, 0.2) }]}>
        <Feather name="book" size={20} color={item.color || FireOneColors.orange} />
      </View>
      <View style={styles.notebookInfo}>
        <ThemedText style={[styles.notebookName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </ThemedText>
        {item.description ? (
          <ThemedText style={[styles.notebookDesc, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.description}
          </ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={theme.textSecondary} />
    </Pressable>
  );

  const renderSnippetItem = ({ item }: { item: Snippet }) => (
    <View style={[styles.snippetCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      {item.title ? (
        <ThemedText style={[styles.snippetTitle, { color: theme.text }]}>
          {item.title}
        </ThemedText>
      ) : null}
      <ThemedText style={[styles.snippetContent, { color: theme.text }]} numberOfLines={4}>
        {item.content}
      </ThemedText>
      {item.notes ? (
        <ThemedText style={[styles.snippetNotes, { color: theme.textSecondary }]}>
          {item.notes}
        </ThemedText>
      ) : null}
      {item.tags && item.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {item.tags.map((tag, idx) => (
            <View key={idx} style={[styles.tag, { backgroundColor: withOpacity(theme.primary, 0.15) }]}>
              <ThemedText style={[styles.tagText, { color: theme.primary }]}>{tag}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.snippetActions}>
        <Pressable
          onPress={() => handleCopySnippet(item)}
          style={({ pressed }) => [styles.snippetAction, pressed && { opacity: 0.7 }]}
        >
          <Feather name="copy" size={16} color={theme.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => handleDeleteSnippet(item)}
          style={({ pressed }) => [styles.snippetAction, pressed && { opacity: 0.7 }]}
        >
          <Feather name="trash-2" size={16} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          Notebooks
        </ThemedText>
        <Pressable
          onPress={() => setShowNewNotebookModal(true)}
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
        >
          <Feather name="plus" size={24} color={FireOneColors.orange} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.notebooksPanel, { borderRightColor: theme.border }]}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            My Notebooks
          </ThemedText>
          {notebooks.length > 0 ? (
            <FlatList
              data={notebooks}
              renderItem={renderNotebookItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="book" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No notebooks yet
              </ThemedText>
              <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Create your first notebook to save snippets from conversations
              </ThemedText>
            </View>
          )}
        </View>

        {selectedNotebook ? (
          <View style={styles.snippetsPanel}>
            <View style={styles.snippetsPanelHeader}>
              <View>
                <ThemedText style={[styles.selectedNotebookName, { color: theme.text }]}>
                  {selectedNotebook.name}
                </ThemedText>
                {selectedNotebook.description ? (
                  <ThemedText style={[styles.selectedNotebookDesc, { color: theme.textSecondary }]}>
                    {selectedNotebook.description}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.notebookActions}>
                <Pressable
                  onPress={handleExportNotebook}
                  style={({ pressed }) => [styles.actionButton, { backgroundColor: theme.backgroundSecondary }, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="download" size={18} color={theme.text} />
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteNotebook(selectedNotebook)}
                  style={({ pressed }) => [styles.actionButton, { backgroundColor: theme.backgroundSecondary }, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>

            {snippets.length > 0 ? (
              <FlatList
                data={snippets}
                renderItem={renderSnippetItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              />
            ) : (
              <View style={styles.emptyState}>
                <Feather name="bookmark" size={48} color={theme.textSecondary} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No snippets yet
                </ThemedText>
                <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  Save responses from chats to this notebook
                </ThemedText>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.snippetsPanel, styles.emptyPanel]}>
            <Feather name="arrow-left" size={32} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary, marginTop: Spacing.md }]}>
              Select a notebook to view snippets
            </ThemedText>
          </View>
        )}
      </View>

      <Modal
        visible={showNewNotebookModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewNotebookModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNewNotebookModal(false)}
        >
          <View style={[styles.modal, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
              New Notebook
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={newNotebookName}
              onChangeText={setNewNotebookName}
              placeholder="Notebook name"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={newNotebookDescription}
              onChangeText={setNewNotebookDescription}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textSecondary}
              multiline
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowNewNotebookModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleCreateNotebook}
                style={[styles.modalButton, { backgroundColor: FireOneColors.orange }]}
              >
                <ThemedText style={{ color: "#FFFFFF" }}>Create</ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
        >
          <View style={[styles.modal, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
              Edit Notebook
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Notebook name"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textSecondary}
              multiline
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleEditNotebook}
                style={[styles.modalButton, { backgroundColor: FireOneColors.orange }]}
              >
                <ThemedText style={{ color: "#FFFFFF" }}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    flexDirection: "row",
  },
  notebooksPanel: {
    width: "40%",
    maxWidth: 300,
    borderRightWidth: 1,
    padding: Spacing.md,
  },
  snippetsPanel: {
    flex: 1,
    padding: Spacing.md,
  },
  emptyPanel: {
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  notebookCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  notebookIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  notebookInfo: {
    flex: 1,
  },
  notebookName: {
    fontSize: 15,
    fontWeight: "600",
  },
  notebookDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  snippetsPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  selectedNotebookName: {
    fontSize: 20,
    fontWeight: "700",
  },
  selectedNotebookDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  notebookActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  snippetCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  snippetTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  snippetContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  snippetNotes: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: Spacing.sm,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  snippetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  snippetAction: {
    padding: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: Spacing.md,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: 320,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
});
