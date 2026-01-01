import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SearchResult {
  conversationId: number;
  conversationTitle: string;
  messageId: number;
  messageContent: string;
  messageRole: string;
  messageCreatedAt: string;
}

interface FavoriteMessage {
  id: number;
  conversationId: number;
  content: string;
  role: string;
  isFavorite: boolean;
  createdAt: string;
}

const HAPTIC_STORAGE_KEY = "@fyreone_haptic_enabled";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  React.useEffect(() => {
    AsyncStorage.getItem(HAPTIC_STORAGE_KEY).then((val) => {
      if (val !== null) setHapticEnabled(val === "true");
    });
  }, []);

  const triggerHaptic = useCallback(async (type: "light" | "medium" = "light") => {
    if (Platform.OS !== "web" && hapticEnabled) {
      await Haptics.impactAsync(
        type === "light" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      );
    }
  }, [hapticEnabled]);

  const { data: favorites = [], refetch: refetchFavorites } = useQuery<FavoriteMessage[]>({
    queryKey: ["/api/favorites"],
    enabled: activeTab === "favorites",
  });

  const unfavoriteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const url = new URL(`/api/messages/${messageId}/favorite`, getApiUrl());
      const response = await fetch(url.toString(), { method: "POST" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      triggerHaptic("medium");
    },
  });

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const url = new URL("/api/search", getApiUrl());
      url.searchParams.set("q", query.trim());
      const response = await fetch(url.toString());
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <ThemedText key={i} style={{ backgroundColor: withOpacity(FireOneColors.orange, 0.3) }}>
          {part}
        </ThemedText>
      ) : (
        part
      )
    );
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <Pressable
      style={[styles.resultCard, { backgroundColor: theme.assistantBubble, borderColor: theme.border }]}
      onPress={() => {
        triggerHaptic("light");
        navigation.navigate("Chat", { conversationId: item.conversationId });
      }}
    >
      <View style={styles.resultHeader}>
        <ThemedText style={[styles.conversationTitle, { color: FireOneColors.orange }]}>
          {item.conversationTitle}
        </ThemedText>
        <View style={[styles.roleBadge, { backgroundColor: item.messageRole === "user" ? theme.userBubble : withOpacity(FireOneColors.orange, 0.1) }]}>
          <ThemedText style={[styles.roleText, { color: item.messageRole === "user" ? "#FFFFFF" : FireOneColors.orange }]}>
            {item.messageRole === "user" ? "You" : "AI"}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.messagePreview, { color: theme.text }]} numberOfLines={3}>
        {highlightMatch(item.messageContent, searchQuery)}
      </ThemedText>
      <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
        {new Date(item.messageCreatedAt).toLocaleDateString()}
      </ThemedText>
    </Pressable>
  );

  const renderFavorite = ({ item }: { item: FavoriteMessage }) => (
    <View style={[styles.resultCard, { backgroundColor: theme.assistantBubble, borderColor: theme.border }]}>
      <View style={styles.favoriteHeader}>
        <View style={[styles.roleBadge, { backgroundColor: item.role === "user" ? theme.userBubble : withOpacity(FireOneColors.orange, 0.1) }]}>
          <ThemedText style={[styles.roleText, { color: item.role === "user" ? "#FFFFFF" : FireOneColors.orange }]}>
            {item.role === "user" ? "You" : "AI"}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => unfavoriteMutation.mutate(item.id)}
          style={[styles.unfavoriteButton, { backgroundColor: withOpacity(FireOneColors.orange, 0.1) }]}
        >
          <Feather name="bookmark" size={16} color={FireOneColors.orange} />
        </Pressable>
      </View>
      <ThemedText style={[styles.messagePreview, { color: theme.text }]} numberOfLines={5}>
        {item.content}
      </ThemedText>
      <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
        {new Date(item.createdAt).toLocaleDateString()}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.title, { color: theme.text }]}>
          {activeTab === "search" ? "Search" : "Favorites"}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.tabContainer, { borderColor: theme.border }]}>
        {(["search", "favorites"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              triggerHaptic("light");
              if (tab === "favorites") refetchFavorites();
            }}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: withOpacity(FireOneColors.orange, 0.1), borderColor: FireOneColors.orange },
            ]}
          >
            <Feather
              name={tab === "search" ? "search" : "bookmark"}
              size={18}
              color={activeTab === tab ? FireOneColors.orange : theme.textSecondary}
            />
            <ThemedText style={[styles.tabText, { color: activeTab === tab ? FireOneColors.orange : theme.textSecondary }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {activeTab === "search" && (
        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearch("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      {activeTab === "search" && isSearching && (
        <ActivityIndicator size="small" color={FireOneColors.orange} style={styles.loader} />
      )}

      {activeTab === "search" ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => `${item.messageId}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery.length > 0 ? "No results found" : "Type to search conversations"}
              </ThemedText>
            </View>
          }
        />
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavorite}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="bookmark" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No favorites yet
              </ThemedText>
            </View>
          }
        />
      )}
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
    paddingBottom: Spacing.md,
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
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: BorderRadius.md,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  loader: {
    marginTop: Spacing.lg,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  resultCard: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  favoriteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  messagePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },
  unfavoriteButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing["3xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
