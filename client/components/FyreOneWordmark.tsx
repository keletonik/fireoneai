import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Text as SvgText, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

interface FyreOneWordmarkProps {
  height?: number;
  isDark?: boolean;
  className?: string;
}

export function FyreOneWordmark({ height = 32, isDark }: FyreOneWordmarkProps) {
  const { isDark: themeDark } = useTheme();
  const dark = isDark ?? themeDark;
  
  const gradientId = `fyreGradient-${Math.random().toString(36).substr(2, 9)}`;
  const aspectRatio = 160 / 32;
  const width = height * aspectRatio;

  return (
    <View style={[styles.container, { height, width }]}>
      <Svg width={width} height={height} viewBox="0 0 160 32">
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#fdba74" />
            <Stop offset="40%" stopColor="#fb923c" />
            <Stop offset="100%" stopColor="#ea580c" />
          </LinearGradient>
        </Defs>
        
        <SvgText
          x="0"
          y="24"
          fontFamily="System"
          fontSize="26"
          fontWeight="700"
          fill={`url(#${gradientId})`}
        >
          Fyre
        </SvgText>
        
        <SvgText
          x="60"
          y="24"
          fontFamily="System"
          fontSize="26"
          fontWeight="700"
          fill={dark ? "#f8fafc" : "#1e293b"}
        >
          One
        </SvgText>
        
        <Rect
          x="122"
          y="8"
          width="28"
          height="16"
          rx="4"
          fill={dark ? "#334155" : "#f1f5f9"}
          stroke={dark ? "#475569" : "#e2e8f0"}
          strokeWidth="1"
        />
        <SvgText
          x="136"
          y="20"
          fontFamily="System"
          fontSize="10"
          fontWeight="600"
          fill={dark ? "#94a3b8" : "#64748b"}
          textAnchor="middle"
        >
          AI
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default FyreOneWordmark;
