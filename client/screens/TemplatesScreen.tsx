import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface QuickTemplate {
  id: number;
  title: string;
  content: string;
  category: string;
  usageCount: number;
  createdAt: string;
}

const HAPTIC_STORAGE_KEY = "@fyreone_haptic_enabled";

const DEFAULT_TEMPLATES = [
  { title: "AFSS Requirements", content: "What are the key requirements for an Annual Fire Safety Statement (AFSS) for a Class 5 commercial building?", category: "afss" },
  { title: "FRL Query", content: "What is the required Fire Resistance Level (FRL) for load-bearing walls in a Type A construction building?", category: "compliance" },
  { title: "Sprinkler Standards", content: "What Australian Standards apply to the installation and maintenance of automatic sprinkler systems?", category: "standards" },
  { title: "Egress Width", content: "How do I calculate the required egress width for a building with an occupant load of 500 people?", category: "calculate" },
  { title: "Essential Measures", content: "List all essential fire safety measures that must be inspected annually for a Class 9a health care building.", category: "audit" },
];

export default function TemplatesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [hapticEnabled, setHapticEnabled] = useState(true);

  const onSelectTemplate = (route.params as any)?.onSelectTemplate;

  React.useEffect(() => {
    AsyncStorage.getItem(HAPTIC_STORAGE_KEY).then((val) => {
      if (val !== null) setHapticEnabled(val === "true");
    });
  }, []);

  const triggerHaptic = useCallback(async (type: "light" | "medium" | "success" = "light") => {
    if (Platform.OS !== "web" && hapticEnabled) {
      if (type === "success") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(
          type === "light" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
        );
      }
    }
  }, [hapticEnabled]);

  const { data: templates = [], isLoading } = useQuery<QuickTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category?: string }) => {
      const url = new URL("/api/templates", getApiUrl());
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setShowAddModal(false);
      setNewTitle("");
      setNewContent("");
      triggerHaptic("success");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = new URL(`/api/templates/${id}`, getApiUrl());
      await fetch(url.toString(), { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      triggerHaptic("medium");
    },
  });

  const useMutation_ = useMutation({
    mutationFn: async (id: number) => {
      const url = new URL(`/api/templates/${id}/use`, getApiUrl());
      await fetch(url.toString(), { method: "POST" });
    },
  });

  const handleSelectTemplate = (template: QuickTemplate) => {
    triggerHaptic("light");
    useMutation_.mutate(template.id);
    if (onSelectTemplate) {
      onSelectTemplate(template.content);
      navigation.goBack();
    }
  };

  const handleDelete = (template: QuickTemplate) => {
    Alert.alert("Delete Template", `Delete "${template.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(template.id),
      },
    ]);
  };

  const handleAddDefaults = async () => {
    for (const t of DEFAULT_TEMPLATES) {
      await createMutation.mutateAsync(t);
    }
  };

  const renderTemplate = ({ item }: { item: QuickTemplate }) => (
    <Pressable
      style={[styles.templateCard, { backgroundColor: theme.assistantBubble, borderColor: theme.border }]}
      onPress={() => handleSelectTemplate(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.templateHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: withOpacity(FireOneColors.orange, 0.1) }]}>
          <ThemedText style={[styles.categoryText, { color: FireOneColors.orange }]}>
            {item.category || "general"}
          </ThemedText>
        </View>
        <ThemedText style={[styles.usageCount, { color: theme.textSecondary }]}>
          Used {item.usageCount}x
        </ThemedText>
      </View>
      <ThemedText style={[styles.templateTitle, { color: theme.text }]}>{item.title}</ThemedText>
      <ThemedText style={[styles.templateContent, { color: theme.textSecondary }]} numberOfLines={2}>
        {item.content}
      </ThemedText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.title, { color: theme.text }]}>Quick Templates</ThemedText>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Feather name="plus" size={24} color={FireOneColors.orange} />
        </Pressable>
      </View>

      <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
        Tap to use, long press to delete
      </ThemedText>

      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="file-text" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No templates yet
            </ThemedText>
            <Pressable
              onPress={handleAddDefaults}
              style={[styles.addDefaultsButton, { backgroundColor: FireOneColors.orange }]}
            >
              <ThemedText style={styles.addDefaultsText}>Add Default Templates</ThemedText>
            </Pressable>
          </View>
        }
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>New Template</ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              placeholder="Template name"
              placeholderTextColor={theme.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={[styles.modalTextArea, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              placeholder="Template question..."
              placeholderTextColor={theme.textSecondary}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Pressable
              onPress={() => createMutation.mutate({ title: newTitle, content: newContent })}
              disabled={!newTitle.trim() || !newContent.trim()}
              style={[
                styles.saveButton,
                { backgroundColor: newTitle.trim() && newContent.trim() ? FireOneColors.orange : theme.border },
              ]}
            >
              <ThemedText style={styles.saveButtonText}>Save Template</ThemedText>
            </Pressable>
          </View>
        </View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
  },
  addButton: {
    padding: Spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  templateCard: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  usageCount: {
    fontSize: 11,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  templateContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing["3xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
  },
  addDefaultsButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  addDefaultsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
    minHeight: 100,
  },
  saveButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
