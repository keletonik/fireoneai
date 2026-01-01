import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { FireOneColors } from "@/constants/theme";

interface LoadingSquaresProps {
  size?: "small" | "medium" | "large";
  color?: string;
}

const SIZE_CONFIG = {
  small: { square: 8, gap: 4 },
  medium: { square: 12, gap: 6 },
  large: { square: 20, gap: 10 },
};

export function LoadingSquares({ size = "medium", color = FireOneColors.orange }: LoadingSquaresProps) {
  const config = SIZE_CONFIG[size];
  
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);
  
  const opacity1 = useSharedValue(0.4);
  const opacity2 = useSharedValue(0.4);
  const opacity3 = useSharedValue(0.4);
  const opacity4 = useSharedValue(0.4);

  useEffect(() => {
    const duration = 400;
    const delay = 150;

    scale1.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1,
      false
    );
    opacity1.value = withRepeat(
      withSequence(
        withTiming(1, { duration }),
        withTiming(0.4, { duration })
      ),
      -1,
      false
    );

    scale2.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(1, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
        ),
        -1,
        false
      )
    );
    opacity2.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.4, { duration })
        ),
        -1,
        false
      )
    );

    scale3.value = withDelay(
      delay * 2,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(1, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
        ),
        -1,
        false
      )
    );
    opacity3.value = withDelay(
      delay * 2,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.4, { duration })
        ),
        -1,
        false
      )
    );

    scale4.value = withDelay(
      delay * 3,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(1, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
        ),
        -1,
        false
      )
    );
    opacity4.value = withDelay(
      delay * 3,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.4, { duration })
        ),
        -1,
        false
      )
    );
  }, []);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  const style3 = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
    opacity: opacity3.value,
  }));

  const style4 = useAnimatedStyle(() => ({
    transform: [{ scale: scale4.value }],
    opacity: opacity4.value,
  }));

  const squareStyle = {
    width: config.square,
    height: config.square,
    borderRadius: config.square * 0.2,
    backgroundColor: color,
  };

  return (
    <View style={[styles.container, { gap: config.gap }]}>
      <Animated.View style={[squareStyle, style1]} />
      <Animated.View style={[squareStyle, style2]} />
      <Animated.View style={[squareStyle, style3]} />
      <Animated.View style={[squareStyle, style4]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
