/**
 * FireSafetyGrid.tsx
 * 
 * Animated background showing connected sprinkler heads and smoke alarms
 * with monitoring pulses traveling between devices. Perfect for fire safety
 * compliance applications.
 * 
 * Usage:
 *   <FireSafetyGrid isDark={false} />
 */

import { useEffect, useRef } from 'react';

interface FireSafetyGridProps {
  isDark?: boolean;
  className?: string;
}

export function FireSafetyGrid({ isDark = false, className = '' }: FireSafetyGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Node types
    interface Node {
      x: number;
      y: number;
      type: 'sprinkler' | 'alarm';
      size: number;
      pulsePhase: number;
      isActive: boolean;
      activeTimer: number;
      statusBlink: number;
    }

    interface Connection {
      from: number;
      to: number;
      dist: number;
    }

    interface Signal {
      id: number;
      fromNode: number;
      toNode: number;
      progress: number;
      speed: number;
      type: 'alert' | 'check';
    }

    interface Spray {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      size: number;
    }

    // Create safety device nodes
    const nodeCount = Math.floor((width * height) / 20000);
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const type = Math.random() > 0.5 ? 'sprinkler' : 'alarm';
      nodes.push({
        x: 50 + Math.random() * (width - 100),
        y: 50 + Math.random() * (height - 100),
        type,
        size: type === 'sprinkler' ? 8 : 6,
        pulsePhase: Math.random() * Math.PI * 2,
        isActive: false,
        activeTimer: 0,
        statusBlink: Math.random() * Math.PI * 2,
      });
    }

    // Find connections
    const maxDistance = 180;
    const connections: Connection[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDistance) {
          connections.push({ from: i, to: j, dist });
        }
      }
    }

    const signals: Signal[] = [];
    let signalId = 0;
    const sprays: Spray[] = [];

    const spawnSignal = () => {
      if (connections.length === 0) return;
      const conn = connections[Math.floor(Math.random() * connections.length)];
      const direction = Math.random() > 0.5;
      signals.push({
        id: signalId++,
        fromNode: direction ? conn.from : conn.to,
        toNode: direction ? conn.to : conn.from,
        progress: 0,
        speed: 0.008 + Math.random() * 0.006,
        type: Math.random() > 0.7 ? 'alert' : 'check',
      });
    };

    const activateSprinkler = (nodeIndex: number) => {
      const node = nodes[nodeIndex];
      if (node.type !== 'sprinkler' || node.isActive) return;
      node.isActive = true;
      node.activeTimer = 180;
    };

    const drawSprinkler = (x: number, y: number, size: number, isActive: boolean, phase: number) => {
      const pulse = Math.sin(phase) * 0.1 + 1;

      // Ceiling mount plate
      ctx.beginPath();
      ctx.arc(x, y - size * 0.3, size * 0.8, Math.PI, 0);
      ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
      ctx.fill();

      // Sprinkler body
      ctx.beginPath();
      ctx.moveTo(x - size * 0.3, y - size * 0.3);
      ctx.lineTo(x - size * 0.5, y + size * 0.5);
      ctx.lineTo(x + size * 0.5, y + size * 0.5);
      ctx.lineTo(x + size * 0.3, y - size * 0.3);
      ctx.closePath();
      ctx.fillStyle = isDark ? '#64748b' : '#cbd5e1';
      ctx.fill();

      // Deflector plate
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.6, size * 0.7, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = isActive
        ? (isDark ? '#f97316' : '#ea580c')
        : (isDark ? '#94a3b8' : '#64748b');
      ctx.fill();

      // Status LED
      const ledGlow = Math.sin(phase * 2) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(x, y - size * 0.1, size * 0.15 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = isActive
        ? `rgba(239, 68, 68, ${ledGlow})`
        : `rgba(34, 197, 94, ${ledGlow * 0.7})`;
      ctx.fill();

      // Active glow
      if (isActive) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.3)');
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    };

    const drawAlarm = (x: number, y: number, size: number, phase: number) => {
      const pulse = Math.sin(phase) * 0.05 + 1;

      // Alarm body
      ctx.beginPath();
      ctx.arc(x, y, size * pulse, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#475569' : '#e2e8f0';
      ctx.fill();

      // Inner ring
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sensor holes
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = x + Math.cos(angle) * size * 0.4;
        const hy = y + Math.sin(angle) * size * 0.4;
        ctx.beginPath();
        ctx.arc(hx, hy, size * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#1e293b' : '#94a3b8';
        ctx.fill();
      }

      // Status LED
      const ledGlow = Math.sin(phase * 1.5) * 0.4 + 0.6;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${ledGlow})`;
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Update nodes
      nodes.forEach((node) => {
        node.pulsePhase += 0.03;
        node.statusBlink += 0.05;

        if (node.isActive) {
          node.activeTimer--;
          if (node.activeTimer <= 0) {
            node.isActive = false;
          }

          // Spawn spray
          if (Math.random() < 0.4) {
            const angle = Math.random() * Math.PI;
            const speed = 1 + Math.random() * 2;
            sprays.push({
              x: node.x + (Math.random() - 0.5) * 10,
              y: node.y + node.size,
              vx: Math.cos(angle + Math.PI * 0.25) * speed * (Math.random() > 0.5 ? 1 : -1),
              vy: Math.sin(angle) * speed + 1,
              life: 1,
              size: 1.5 + Math.random() * 2,
            });
          }
        }
      });

      // Draw connections
      connections.forEach((conn) => {
        const from = nodes[conn.from];
        const to = nodes[conn.to];
        const opacity = (1 - conn.dist / maxDistance) * (isDark ? 0.15 : 0.12);

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = isDark
          ? `rgba(148, 163, 184, ${opacity})`
          : `rgba(100, 116, 139, ${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw devices
      nodes.forEach((node) => {
        if (node.type === 'sprinkler') {
          drawSprinkler(node.x, node.y, node.size, node.isActive, node.pulsePhase);
        } else {
          drawAlarm(node.x, node.y, node.size, node.statusBlink);
        }
      });

      // Update and draw sprays
      for (let i = sprays.length - 1; i >= 0; i--) {
        const spray = sprays[i];
        spray.x += spray.vx;
        spray.y += spray.vy;
        spray.vy += 0.1;
        spray.life -= 0.025;

        if (spray.life <= 0 || spray.y > height) {
          sprays.splice(i, 1);
          continue;
        }

        const gradient = ctx.createRadialGradient(spray.x, spray.y, 0, spray.x, spray.y, spray.size * 2);
        gradient.addColorStop(0, `rgba(147, 197, 253, ${spray.life * 0.8})`);
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${spray.life * 0.5})`);
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.beginPath();
        ctx.arc(spray.x, spray.y, spray.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Spawn signals
      if (Math.random() < 0.02 && signals.length < 6) {
        spawnSignal();
      }

      // Random sprinkler activation
      if (Math.random() < 0.002) {
        const sprinklerNodes = nodes
          .map((n, i) => ({ node: n, index: i }))
          .filter((n) => n.node.type === 'sprinkler' && !n.node.isActive);
        if (sprinklerNodes.length > 0) {
          const random = sprinklerNodes[Math.floor(Math.random() * sprinklerNodes.length)];
          activateSprinkler(random.index);
        }
      }

      // Update and draw signals
      for (let i = signals.length - 1; i >= 0; i--) {
        const signal = signals[i];
        signal.progress += signal.speed;

        if (signal.progress >= 1) {
          signals.splice(i, 1);
          continue;
        }

        const from = nodes[signal.fromNode];
        const to = nodes[signal.toNode];
        const x = from.x + (to.x - from.x) * signal.progress;
        const y = from.y + (to.y - from.y) * signal.progress;

        const intensity = Math.sin(signal.progress * Math.PI);
        const signalColor = signal.type === 'alert'
          ? { r: 249, g: 115, b: 22 }
          : { r: 34, g: 197, b: 94 };

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
        gradient.addColorStop(0, `rgba(${signalColor.r}, ${signalColor.g}, ${signalColor.b}, ${intensity * 0.9})`);
        gradient.addColorStop(0.5, `rgba(${signalColor.r}, ${signalColor.g}, ${signalColor.b}, ${intensity * 0.4})`);
        gradient.addColorStop(1, `rgba(${signalColor.r}, ${signalColor.g}, ${signalColor.b}, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
        ctx.fill();
      }

      if (sprays.length > 100) sprays.splice(0, 20);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: isDark ? 0.7 : 0.5 }}
    />
  );
}

export default FireSafetyGrid;
