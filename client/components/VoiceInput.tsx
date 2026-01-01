import React, { useState, useRef, useEffect } from "react";
import { View, Pressable, StyleSheet, Platform, Modal, Alert, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FireOneColors, withOpacity } from "@/constants/theme";

interface VoiceInputProps {
  visible: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

export function VoiceInput({ visible, onClose, onTranscript }: VoiceInputProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(0.6, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 0.6;
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const checkPermission = async () => {
    if (Platform.OS === "web") {
      setPermissionGranted(true);
      return;
    }
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === "granted");
    } catch (error) {
      console.error("Error checking audio permission:", error);
    }
  };

  const startRecording = async () => {
    if (!permissionGranted) {
      Alert.alert(
        "Microphone Access Required",
        "Please enable microphone access in your device settings to use voice input.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setIsRecording(false);
      setIsTranscribing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
        try {
          const audioBase64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64",
          });

          const extension = uri.split(".").pop()?.toLowerCase() || "m4a";
          const mimeType = extension === "wav" ? "audio/wav" :
                          extension === "webm" ? "audio/webm" :
                          extension === "mp3" ? "audio/mpeg" :
                          extension === "caf" ? "audio/x-caf" :
                          "audio/m4a";

          const response = await apiRequest("POST", "/api/transcribe", {
            audioBase64,
            mimeType,
          });

          const data = await response.json();

          if (data.text && data.text.trim()) {
            onTranscript(data.text.trim());
            onClose();
          } else {
            Alert.alert(
              "No Speech Detected",
              "Could not detect any speech in the recording. Please try again and speak clearly.",
              [{ text: "OK" }]
            );
          }
        } catch (transcribeError: any) {
          console.error("Transcription failed:", transcribeError);
          Alert.alert(
            "Transcription Failed",
            "Could not transcribe your voice. Please try again or type your question instead.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to process recording. Please try again.");
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  if (Platform.OS === "web") {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <View style={[styles.webContainer, { backgroundColor: theme.backgroundRoot }]}>
            <View style={[styles.iconCircle, { backgroundColor: withOpacity(FireOneColors.orange, 0.1) }]}>
              <Feather name="mic-off" size={32} color={FireOneColors.orange} />
            </View>
            <ThemedText style={[styles.webTitle, { color: theme.text }]}>
              Voice Input
            </ThemedText>
            <ThemedText style={[styles.webDesc, { color: theme.textSecondary }]}>
              Voice input is available when using the app in Expo Go on your mobile device.
            </ThemedText>
            <Pressable
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <ThemedText style={{ color: theme.text }}>Close</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.xl }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.cancelButton}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
            <ThemedText style={[styles.title, { color: theme.text }]}>Voice Input</ThemedText>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.content}>
            <ThemedText style={[styles.instruction, { color: theme.textSecondary }]}>
              {isTranscribing ? "Transcribing..." : isRecording ? "Listening..." : "Tap to start speaking"}
            </ThemedText>

            {isRecording ? (
              <ThemedText style={[styles.duration, { color: FireOneColors.orange }]}>
                {formatDuration(recordingDuration)}
              </ThemedText>
            ) : null}

            <View style={styles.buttonContainer}>
              {isRecording ? (
                <Animated.View style={[styles.pulseRing, { borderColor: FireOneColors.orange }, pulseStyle]} />
              ) : null}
              
              {isTranscribing ? (
                <View style={[styles.recordButton, { backgroundColor: theme.backgroundDefault }]}>
                  <ActivityIndicator size="large" color={FireOneColors.orange} />
                </View>
              ) : (
                <Pressable
                  onPress={isRecording ? stopRecording : startRecording}
                  style={[
                    styles.recordButton,
                    { backgroundColor: isRecording ? "#EF4444" : FireOneColors.orange },
                  ]}
                >
                  <Feather
                    name={isRecording ? "square" : "mic"}
                    size={32}
                    color="#FFFFFF"
                  />
                </Pressable>
              )}
            </View>

            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              {isTranscribing ? "Converting speech to text..." : isRecording ? "Tap to stop recording" : "Speak clearly into your device"}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function speakText(text: string): void {
  if (Platform.OS === "web") {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  } else {
    Speech.speak(text, {
      rate: 0.9,
      pitch: 1,
    });
  }
}

export function stopSpeaking(): void {
  if (Platform.OS === "web") {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } else {
    Speech.stop();
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cancelButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  instruction: {
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  duration: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xl,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
  },
  webContainer: {
    margin: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  webDesc: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  closeButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
});
