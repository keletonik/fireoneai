import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  PanResponder,
  Dimensions,
  GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";

const HAPTIC_STORAGE_KEY = "@fyreone_haptic_enabled";
const COLORS = ["#FF6B35", "#EF4444", "#22C55E", "#3B82F6", "#FFFFFF", "#000000"];
const TOOLS = [
  { id: "marker", icon: "circle", label: "Mark" },
  { id: "text", icon: "type", label: "Label" },
  { id: "eraser", icon: "trash-2", label: "Clear" },
];

interface Annotation {
  type: "marker" | "text";
  color: string;
  position: { x: number; y: number };
  text?: string;
}

export default function PhotoAnnotationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const params = route.params as { imageUri?: string; onSave?: (uri: string) => void };
  const imageUri = params?.imageUri || "";
  const onSave = params?.onSave;

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState("marker");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [markerCount, setMarkerCount] = useState(1);
  const [hapticEnabled, setHapticEnabled] = useState(true);

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

  const handleImagePress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    
    if (selectedTool === "marker") {
      setAnnotations((prev) => [
        ...prev,
        { type: "marker", color: selectedColor, position: { x: locationX, y: locationY }, text: String(markerCount) },
      ]);
      setMarkerCount((c) => c + 1);
      triggerHaptic("medium");
    } else if (selectedTool === "text") {
      if (Platform.OS === "ios") {
        Alert.prompt(
          "Add Label",
          "Enter text for this annotation:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add",
              onPress: (text?: string) => {
                if (text?.trim()) {
                  setAnnotations((prev) => [
                    ...prev,
                    { type: "text", color: selectedColor, position: { x: locationX, y: locationY }, text: text.trim() },
                  ]);
                  triggerHaptic("success");
                }
              },
            },
          ],
          "plain-text"
        );
      } else {
        setAnnotations((prev) => [
          ...prev,
          { type: "text", color: selectedColor, position: { x: locationX, y: locationY }, text: `Note ${markerCount}` },
        ]);
        setMarkerCount((c) => c + 1);
        triggerHaptic("success");
      }
    }
  };

  const handleClear = () => {
    Alert.alert("Clear All", "Remove all annotations?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setAnnotations([]);
          setMarkerCount(1);
          triggerHaptic("medium");
        },
      },
    ]);
  };

  const handleUndo = () => {
    if (annotations.length > 0) {
      setAnnotations((prev) => prev.slice(0, -1));
      triggerHaptic("light");
    }
  };

  const handleSave = async () => {
    triggerHaptic("success");
    
    if (onSave) {
      onSave(imageUri);
    }
    
    Alert.alert("Annotations Added", `Added ${annotations.length} annotation(s) to your photo notes.`, [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const screenWidth = Dimensions.get("window").width;
  const imageHeight = screenWidth * 0.75;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.title, { color: theme.text }]}>Annotate Photo</ThemedText>
        <View style={styles.headerActions}>
          <Pressable onPress={handleUndo} style={styles.headerButton} disabled={annotations.length === 0}>
            <Feather name="corner-up-left" size={22} color={annotations.length > 0 ? theme.text : theme.textSecondary} />
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: FireOneColors.orange }]}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <ThemedText style={styles.saveText}>Done</ThemedText>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={handleImagePress} style={[styles.imageContainer, { height: imageHeight }]}>
        <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />
        {annotations.map((ann, i) => (
          <View
            key={i}
            style={[
              ann.type === "marker" ? styles.marker : styles.textAnnotation,
              { 
                left: ann.position.x - (ann.type === "marker" ? 16 : 0), 
                top: ann.position.y - (ann.type === "marker" ? 16 : 10),
                backgroundColor: ann.type === "marker" ? ann.color : "transparent",
              },
            ]}
          >
            <ThemedText style={[
              ann.type === "marker" ? styles.markerText : styles.annotationText,
              ann.type === "text" && { color: ann.color },
            ]}>
              {ann.text}
            </ThemedText>
          </View>
        ))}
      </Pressable>

      <View style={[styles.toolbar, { backgroundColor: theme.assistantBubble, borderColor: theme.border }]}>
        <View style={styles.toolRow}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              onPress={() => {
                if (tool.id === "eraser") {
                  handleClear();
                } else {
                  setSelectedTool(tool.id);
                  triggerHaptic("light");
                }
              }}
              style={[
                styles.toolButton,
                selectedTool === tool.id && tool.id !== "eraser" && { backgroundColor: withOpacity(FireOneColors.orange, 0.2) },
              ]}
            >
              <Feather
                name={tool.icon as any}
                size={22}
                color={selectedTool === tool.id && tool.id !== "eraser" ? FireOneColors.orange : theme.text}
              />
              <ThemedText
                style={[
                  styles.toolLabel,
                  { color: selectedTool === tool.id && tool.id !== "eraser" ? FireOneColors.orange : theme.textSecondary },
                ]}
              >
                {tool.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={[styles.colorRow, { borderTopColor: theme.border }]}>
          {COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => {
                setSelectedColor(color);
                triggerHaptic("light");
              }}
              style={[
                styles.colorButton,
                { backgroundColor: color, borderColor: color === "#FFFFFF" ? theme.border : color },
                selectedColor === color && styles.colorSelected,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.tipContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Feather name="info" size={14} color={theme.textSecondary} />
        <ThemedText style={[styles.tipText, { color: theme.textSecondary }]}>
          Tap on the photo to add markers and labels for compliance notes
        </ThemedText>
      </View>
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
  headerButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#000000",
    position: "relative",
  },
  image: {
    flex: 1,
  },
  marker: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  markerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  textAnnotation: {
    position: "absolute",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  annotationText: {
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  toolbar: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  toolRow: {
    flexDirection: "row",
    padding: Spacing.sm,
  },
  toolButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  toolLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  colorSelected: {
    transform: [{ scale: 1.2 }],
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  tipText: {
    fontSize: 13,
  },
});
