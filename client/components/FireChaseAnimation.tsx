import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent, Platform } from 'react-native';
import Svg, { Rect, Circle, Ellipse, Path, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/useTheme';

interface Character {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
}

interface FireParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface FoamDrop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function FireChaseAnimation() {
  const { theme, isDark } = useTheme();
  const [containerSize, setContainerSize] = useState({ width: 300, height: 120 });
  const [extinguisher, setExtinguisher] = useState<Character>({
    x: 200, y: 60, vx: 0, vy: 0, rotation: 0, scale: 1,
  });
  const [hoseReel, setHoseReel] = useState<Character>({
    x: 80, y: 60, vx: 0, vy: 0, rotation: 0, scale: 1,
  });
  const [fireParticles, setFireParticles] = useState<FireParticle[]>([]);
  const [foamDrops, setFoamDrops] = useState<FoamDrop[]>([]);
  const [isInteracting, setIsInteracting] = useState(false);

  const touchPos = useRef({ x: 0, y: 0 });
  const smoothTouchPos = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);

  const extScale = useSharedValue(1);
  const extRotation = useSharedValue(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
    touchPos.current = { x: width / 2, y: height / 2 };
    smoothTouchPos.current = { x: width / 2, y: height / 2 };
  }, []);

  useEffect(() => {
    const { width, height } = containerSize;
    let ext = { ...extinguisher, x: width * 0.7, y: height / 2 };
    let hose = { ...hoseReel, x: width * 0.25, y: height / 2 };
    let particles: FireParticle[] = [];
    let drops: FoamDrop[] = [];

    const animate = () => {
      smoothTouchPos.current.x += (touchPos.current.x - smoothTouchPos.current.x) * 0.1;
      smoothTouchPos.current.y += (touchPos.current.y - smoothTouchPos.current.y) * 0.1;

      const touch = smoothTouchPos.current;

      const extToTouch = { x: touch.x - ext.x, y: touch.y - ext.y };
      const extDist = Math.sqrt(extToTouch.x ** 2 + extToTouch.y ** 2);
      
      if (extDist > 0 && isInteracting) {
        const fleeStrength = Math.max(0, 180 - extDist) / 180;
        ext.vx -= (extToTouch.x / extDist) * fleeStrength * 2.0;
        ext.vy -= (extToTouch.y / extDist) * fleeStrength * 1.5;
      }

      if (extDist < 120 && isInteracting) {
        ext.vy += Math.sin(Date.now() / 50) * 0.25;
        ext.scale = 1 + Math.sin(Date.now() / 100) * 0.04;
      } else {
        ext.scale += (1 - ext.scale) * 0.1;
      }

      ext.vx *= 0.94;
      ext.vy *= 0.94;
      ext.x += ext.vx;
      ext.y += ext.vy;

      const padding = 30;
      if (ext.x < padding) { ext.x = padding; ext.vx *= -0.7; }
      if (ext.x > width - padding) { ext.x = width - padding; ext.vx *= -0.7; }
      if (ext.y < padding) { ext.y = padding; ext.vy *= -0.7; }
      if (ext.y > height - padding) { ext.y = height - padding; ext.vy *= -0.7; }

      ext.rotation += (ext.vx * 2 - ext.rotation) * 0.1;

      const hoseToExt = { x: ext.x - hose.x, y: ext.y - hose.y };
      const hoseDist = Math.sqrt(hoseToExt.x ** 2 + hoseToExt.y ** 2);

      const minDistance = 60;
      if (hoseDist > minDistance) {
        const chaseStrength = 0.1;
        hose.vx += (hoseToExt.x / hoseDist) * chaseStrength;
        hose.vy += (hoseToExt.y / hoseDist) * chaseStrength;
      } else if (hoseDist < minDistance * 0.8) {
        hose.vx -= (hoseToExt.x / hoseDist) * 0.04;
        hose.vy -= (hoseToExt.y / hoseDist) * 0.04;
      }

      hose.vx *= 0.91;
      hose.vy *= 0.91;
      hose.x += hose.vx;
      hose.y += hose.vy;

      if (hose.x < padding) { hose.x = padding; hose.vx *= -0.5; }
      if (hose.x > width - padding) { hose.x = width - padding; hose.vx *= -0.5; }
      if (hose.y < padding) { hose.y = padding; hose.vy *= -0.5; }
      if (hose.y > height - padding) { hose.y = height - padding; hose.vy *= -0.5; }

      hose.rotation += Math.sqrt(hose.vx ** 2 + hose.vy ** 2) * 0.5;

      if (Math.random() < 0.4) {
        particles.push({
          id: particleIdRef.current++,
          x: ext.x + (Math.random() - 0.5) * 15,
          y: ext.y - 15,
          vx: (Math.random() - 0.5) * 2 + ext.vx * 0.3,
          vy: -Math.random() * 2.5 - 1,
          life: 1,
          maxLife: 0.5 + Math.random() * 0.5,
          size: 4 + Math.random() * 8,
        });
      }

      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.05;
        p.life -= 0.03 / p.maxLife;
        p.size *= 0.97;
        return p.life > 0;
      });

      if (hoseDist < 120 && hoseDist > 40 && Math.random() < 0.6) {
        const angle = Math.atan2(hoseToExt.y, hoseToExt.x);
        const spread = (Math.random() - 0.5) * 0.5;
        drops.push({
          id: particleIdRef.current++,
          x: hose.x + Math.cos(angle) * 25,
          y: hose.y + Math.sin(angle) * 25,
          vx: Math.cos(angle + spread) * (4 + Math.random() * 2),
          vy: Math.sin(angle + spread) * (4 + Math.random() * 2),
          life: 1,
          size: 3 + Math.random() * 4,
        });
      }

      drops = drops.filter((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.1;
        d.life -= 0.04;
        return d.life > 0 && d.y < height + 10;
      });

      if (particles.length > 40) particles = particles.slice(-40);
      if (drops.length > 35) drops = drops.slice(-35);

      setExtinguisher({ ...ext });
      setHoseReel({ ...hose });
      setFireParticles([...particles]);
      setFoamDrops([...drops]);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [containerSize.width, containerSize.height, isInteracting]);

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      runOnJS(setIsInteracting)(true);
      touchPos.current = { x: e.x, y: e.y };
    })
    .onUpdate((e) => {
      touchPos.current = { x: e.x, y: e.y };
    })
    .onEnd(() => {
      runOnJS(setIsInteracting)(false);
    });

  const getFireColor = (life: number) => {
    if (life > 0.7) return '#fef08a';
    if (life > 0.4) return '#fb923c';
    return '#ef4444';
  };

  return (
    <GestureDetector gesture={panGesture}>
      <View 
        style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#1e293b' }]}
        onLayout={handleLayout}
      >
        <View style={[styles.gradientOverlay, { opacity: 0.15 }]} />

        {fireParticles.map((p) => (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x - p.size / 2,
                top: p.y - p.size / 2,
                width: p.size,
                height: p.size,
                opacity: p.life,
                backgroundColor: getFireColor(p.life),
                borderRadius: p.size / 2,
              },
            ]}
          />
        ))}

        {foamDrops.map((d) => (
          <View
            key={d.id}
            style={[
              styles.foam,
              {
                left: d.x - d.size / 2,
                top: d.y - d.size / 2,
                width: d.size,
                height: d.size * 1.2,
                opacity: d.life * 0.9,
                backgroundColor: '#fcd34d',
                borderRadius: d.size / 2,
              },
            ]}
          />
        ))}

        <View
          style={[
            styles.character,
            {
              left: extinguisher.x - 25,
              top: extinguisher.y - 35,
              transform: [
                { rotate: `${extinguisher.rotation}deg` },
                { scale: extinguisher.scale },
              ],
            },
          ]}
        >
          <Svg width="50" height="70" viewBox="0 0 50 70">
            <Rect x="12" y="20" width="26" height="40" rx="4" fill="#dc2626" />
            <Rect x="14" y="22" width="22" height="36" rx="3" fill="#ef4444" />
            <Rect x="16" y="24" width="6" height="30" rx="2" fill="#fca5a5" opacity="0.5" />
            <Rect x="18" y="12" width="14" height="10" rx="2" fill="#9a3412" />
            <Rect x="20" y="8" width="10" height="6" rx="1" fill="#c2410c" />
            <Path d="M32 14 Q40 14 40 22 L40 26 L36 26 L36 20 Q36 18 32 18 Z" fill="#c2410c" />
            <Path d="M12 35 Q4 35 4 42 L4 55" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" fill="none" />
            <Circle cx="4" cy="55" r="3" fill="#9a3412" />
            <Rect x="17" y="32" width="16" height="20" rx="1" fill="#fef3c7" />
            <SvgText x="25" y="44" textAnchor="middle" fontSize="6" fill="#dc2626" fontWeight="bold">FIRE</SvgText>
            <SvgText x="25" y="50" textAnchor="middle" fontSize="4" fill="#92400e">EXT</SvgText>
            <Ellipse cx="19" cy="28" rx="3" ry="4" fill="white" />
            <Ellipse cx="31" cy="28" rx="3" ry="4" fill="white" />
            <Circle cx="20" cy="29" r="1.5" fill="#1f2937" />
            <Circle cx="32" cy="29" r="1.5" fill="#1f2937" />
            <Path d="M36 24 Q38 20 37 26 Q36 28 36 24" fill="#fcd34d" />
            <G>
              <Path d="M20 8 Q22 0 25 8 Q28 2 30 8" fill="#f97316" />
              <Path d="M23 5 Q25 1 27 5" fill="#fef08a" />
            </G>
          </Svg>
        </View>

        <View
          style={[
            styles.character,
            {
              left: hoseReel.x - 30,
              top: hoseReel.y - 30,
            },
          ]}
        >
          <Svg width="60" height="60" viewBox="0 0 60 60">
            <Rect x="10" y="15" width="40" height="30" rx="3" fill="#ea580c" />
            <Rect x="12" y="17" width="36" height="26" rx="2" fill="#f97316" />
            <Circle cx="30" cy="30" r="10" fill="#7c2d12" />
            <Circle cx="30" cy="30" r="8" fill="none" stroke="#9a3412" strokeWidth="3" strokeDasharray="4 2" />
            <Circle cx="30" cy="30" r="3" fill="#fbbf24" />
            <G>
              <Circle cx="15" cy="50" r="6" fill="#7c2d12" />
              <Circle cx="15" cy="50" r="4" fill="#451a03" />
              <Circle cx="15" cy="50" r="1.5" fill="#a16207" />
            </G>
            <G>
              <Circle cx="45" cy="50" r="6" fill="#7c2d12" />
              <Circle cx="45" cy="50" r="4" fill="#451a03" />
              <Circle cx="45" cy="50" r="1.5" fill="#a16207" />
            </G>
            <Rect x="25" y="5" width="10" height="12" rx="2" fill="#9a3412" />
            <Rect x="27" y="2" width="6" height="5" rx="1" fill="#7c2d12" />
            <Path d="M50 30 L58 30 L56 27 L58 30 L56 33 Z" fill="#fbbf24" />
            <Ellipse cx="23" cy="26" rx="3" ry="3" fill="white" />
            <Ellipse cx="37" cy="26" rx="3" ry="3" fill="white" />
            <Circle cx="24" cy="27" r="1.5" fill="#1f2937" />
            <Circle cx="38" cy="27" r="1.5" fill="#1f2937" />
            <Path d="M20 22 L26 24" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
            <Path d="M40 22 L34 24" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
            <Path d="M26 34 Q30 38 34 34" stroke="#451a03" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </Svg>
        </View>

        <View style={styles.hintContainer}>
          <Animated.Text style={[styles.hintText, { color: 'rgba(251, 146, 60, 0.6)' }]}>
            {isInteracting ? "Run, little extinguisher!" : "Touch & drag to chase"}
          </Animated.Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 120,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249, 115, 22, 0.3)',
    position: 'relative',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f97316',
  },
  particle: {
    position: 'absolute',
  },
  foam: {
    position: 'absolute',
  },
  character: {
    position: 'absolute',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default FireChaseAnimation;
