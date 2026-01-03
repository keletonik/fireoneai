import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import Svg, { Circle, Line, G, Ellipse, Rect, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Node {
  id: number;
  x: number;
  y: number;
  type: "sprinkler" | "alarm";
  size: number;
}

interface Connection {
  from: number;
  to: number;
}

interface FireSafetyGridProps {
  isDark?: boolean;
}

export function FireSafetyGrid({ isDark }: FireSafetyGridProps) {
  const { isDark: themeDark } = useTheme();
  const dark = isDark ?? themeDark;
  
  const { width, height } = Dimensions.get("window");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeSignals, setActiveSignals] = useState<number[]>([]);
  
  useEffect(() => {
    const nodeCount = Math.max(8, Math.floor((width * height) / 25000));
    const padding = 60;
    const newNodes: Node[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      newNodes.push({
        id: i,
        x: padding + Math.random() * (width - padding * 2),
        y: padding + Math.random() * (height - padding * 2),
        type: Math.random() > 0.5 ? "sprinkler" : "alarm",
        size: Math.random() > 0.5 ? 10 : 8,
      });
    }
    
    const maxDistance = 200;
    const newConnections: Connection[] = [];
    
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const dx = newNodes[i].x - newNodes[j].x;
        const dy = newNodes[i].y - newNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDistance) {
          newConnections.push({ from: i, to: j });
        }
      }
    }
    
    setNodes(newNodes);
    setConnections(newConnections);
  }, [width, height]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (connections.length > 0) {
        const randomIdx = Math.floor(Math.random() * connections.length);
        setActiveSignals(prev => {
          const next = [...prev, randomIdx];
          if (next.length > 3) next.shift();
          return next;
        });
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [connections]);
  
  const connectionColor = dark 
    ? "rgba(148, 163, 184, 0.12)" 
    : "rgba(100, 116, 139, 0.1)";
  
  const sprinklerBodyColor = dark ? "#475569" : "#94a3b8";
  const sprinklerPlateColor = dark ? "#64748b" : "#cbd5e1";
  const alarmBodyColor = dark ? "#475569" : "#e2e8f0";
  const alarmRingColor = dark ? "#334155" : "#cbd5e1";
  
  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="signalGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="checkGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        {connections.map((conn, idx) => {
          const fromNode = nodes[conn.from];
          const toNode = nodes[conn.to];
          if (!fromNode || !toNode) return null;
          
          return (
            <Line
              key={`conn-${idx}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={connectionColor}
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
          );
        })}
        
        {nodes.map((node) => (
          <G key={`node-${node.id}`}>
            {node.type === "sprinkler" ? (
              <G>
                <Circle
                  cx={node.x}
                  cy={node.y - node.size * 0.3}
                  r={node.size * 0.8}
                  fill={sprinklerBodyColor}
                />
                <Rect
                  x={node.x - node.size * 0.4}
                  y={node.y - node.size * 0.3}
                  width={node.size * 0.8}
                  height={node.size * 0.8}
                  fill={sprinklerPlateColor}
                />
                <Ellipse
                  cx={node.x}
                  cy={node.y + node.size * 0.6}
                  rx={node.size * 0.7}
                  ry={node.size * 0.2}
                  fill={dark ? "#94a3b8" : "#64748b"}
                />
                <PulsingLED x={node.x} y={node.y - node.size * 0.1} size={node.size * 0.15} color="#22c55e" />
              </G>
            ) : (
              <G>
                <Circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size}
                  fill={alarmBodyColor}
                />
                <Circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size * 0.7}
                  stroke={alarmRingColor}
                  strokeWidth={1.5}
                  fill="none"
                />
                <PulsingLED x={node.x} y={node.y} size={node.size * 0.2} color="#22c55e" />
              </G>
            )}
          </G>
        ))}
        
        {activeSignals.map((signalIdx, i) => {
          const conn = connections[signalIdx];
          if (!conn) return null;
          const fromNode = nodes[conn.from];
          const toNode = nodes[conn.to];
          if (!fromNode || !toNode) return null;
          
          return (
            <AnimatedSignal
              key={`signal-${signalIdx}-${i}`}
              fromX={fromNode.x}
              fromY={fromNode.y}
              toX={toNode.x}
              toY={toNode.y}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function PulsingLED({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const opacity = useSharedValue(0.5);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);
  
  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));
  
  return (
    <AnimatedCircle
      cx={x}
      cy={y}
      r={size}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

function AnimatedSignal({ fromX, fromY, toX, toY }: { fromX: number; fromY: number; toX: number; toY: number }) {
  const progress = useSharedValue(0);
  
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 2000, easing: Easing.linear });
  }, [fromX, fromY, toX, toY]);
  
  const animatedProps = useAnimatedProps(() => {
    const x = fromX + (toX - fromX) * progress.value;
    const y = fromY + (toY - fromY) * progress.value;
    const op = Math.sin(progress.value * Math.PI);
    
    return {
      cx: x,
      cy: y,
      opacity: op,
    };
  });
  
  return (
    <AnimatedCircle
      r={8}
      fill="url(#signalGlow)"
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    opacity: 0.6,
  },
});

export default FireSafetyGrid;
