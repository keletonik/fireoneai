import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { Message } from "@/components/MessageBubble";

const USER_ID_KEY = "@fyreone_user_id";

interface Notebook {
  id: number;
  name: string;
  description?: string;
  color?: string;
}

interface SaveToNotebookModalProps {
  visible: boolean;
  onClose: () => void;
  message: Message | null;
  conversationId: number | null;
}

export function SaveToNotebookModal({ visible, onClose, message, conversationId }: SaveToNotebookModalProps) {
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(USER_ID_KEY).then((id) => setUserId(id));
    }
  }, [visible]);

  useEffect(() => {
    if (message) {
      const previewContent = message.content.substring(0, 100);
      setTitle(previewContent + (message.content.length > 100 ? "..." : ""));
    }
  }, [message]);

  const { data: notebooks = [], isLoading, refetch } = useQuery<Notebook[]>({
    queryKey: ["/api/notebooks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(new URL(`/api/notebooks?userId=${userId}`, getApiUrl()).toString());
      if (!res.ok) throw new Error("Failed to fetch notebooks");
      return res.json();
    },
    enabled: !!userId && visible,
  });

  useEffect(() => {
    if (userId && visible) {
      refetch();
    }
  }, [userId, visible, refetch]);

  const createNotebookMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/notebooks", { userId, name });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks"] });
      setSelectedNotebook(data.id);
      setShowNewNotebook(false);
      setNewNotebookName("");
    },
  });

  const saveSnippetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNotebook || !message) return;

      await apiRequest("POST", `/api/notebooks/${selectedNotebook}/snippets`, {
        conversationId,
        messageId: message.id,
        content: message.content,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.trim() ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/notebooks", selectedNotebook, "snippets"] });
      handleClose();
    },
  });

  const handleClose = () => {
    setSelectedNotebook(null);
    setTitle("");
    setNotes("");
    setTags("");
    setShowNewNotebook(false);
    setNewNotebookName("");
    onClose();
  };

  const handleSave = () => {
    if (selectedNotebook && message) {
      saveSnippetMutation.mutate();
    }
  };

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      createNotebookMutation.mutate(newNotebookName.trim());
    }
  };

  if (!message) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <Pressable 
            style={[styles.modal, { backgroundColor: theme.backgroundRoot }]} 
            onPress={() => {}}
          >
            <View style={styles.header}>
            <ThemedText style={[styles.title, { color: theme.text }]}>Save to Notebook</ThemedText>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.preview, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <ThemedText style={[styles.previewLabel, { color: theme.textSecondary }]}>Preview</ThemedText>
            <ThemedText style={[styles.previewText, { color: theme.text }]} numberOfLines={3}>
              {message.content}
            </ThemedText>
          </View>

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Select Notebook</ThemedText>
          {isLoading ? (
            <ActivityIndicator size="small" color={FireOneColors.orange} />
          ) : (
            <ScrollView style={styles.notebookList} horizontal showsHorizontalScrollIndicator={false}>
              {notebooks.map((notebook) => (
                <Pressable
                  key={notebook.id}
                  onPress={() => setSelectedNotebook(notebook.id)}
                  style={[
                    styles.notebookChip,
                    {
                      backgroundColor:
                        selectedNotebook === notebook.id
                          ? withOpacity(FireOneColors.orange, 0.2)
                          : theme.backgroundSecondary,
                      borderColor:
                        selectedNotebook === notebook.id ? FireOneColors.orange : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name="book"
                    size={14}
                    color={selectedNotebook === notebook.id ? FireOneColors.orange : theme.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.notebookChipText,
                      {
                        color: selectedNotebook === notebook.id ? FireOneColors.orange : theme.text,
                      },
                    ]}
                  >
                    {notebook.name}
                  </ThemedText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setShowNewNotebook(true)}
                style={[styles.notebookChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              >
                <Feather name="plus" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.notebookChipText, { color: theme.textSecondary }]}>
                  New
                </ThemedText>
              </Pressable>
            </ScrollView>
          )}

          {showNewNotebook ? (
            <View style={styles.newNotebookRow}>
              <TextInput
                style={[styles.input, styles.newNotebookInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={newNotebookName}
                onChangeText={setNewNotebookName}
                placeholder="Notebook name"
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />
              <Pressable
                onPress={handleCreateNotebook}
                style={[styles.createButton, { backgroundColor: FireOneColors.orange }]}
                disabled={createNotebookMutation.isPending}
              >
                {createNotebookMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="check" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          ) : null}

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Title (optional)</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Add a title"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Notes (optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this snippet"
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Tags (comma separated)</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
            value={tags}
            onChangeText={setTags}
            placeholder="e.g., AFSS, Fire doors, NCC"
            placeholderTextColor={theme.textSecondary}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!selectedNotebook || saveSnippetMutation.isPending}
              style={[
                styles.actionButton,
                {
                  backgroundColor: selectedNotebook ? FireOneColors.orange : theme.backgroundSecondary,
                  opacity: selectedNotebook ? 1 : 0.5,
                },
              ]}
            >
              {saveSnippetMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={{ color: selectedNotebook ? "#FFFFFF" : theme.textSecondary }}>
                  Save Snippet
                </ThemedText>
              )}
            </Pressable>
          </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  keyboardView: {
    width: "100%",
    maxWidth: 400,
    justifyContent: "center",
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  preview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notebookList: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  notebookChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  notebookChipText: {
    fontSize: 14,
  },
  newNotebookRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  newNotebookInput: {
    flex: 1,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
