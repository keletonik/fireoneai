import { useEffect, useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

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

interface WaterDrop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export function FireChaseAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const mousePos = useRef<Position>({ x: 0, y: 0 });
  const lastMousePos = useRef<Position>({ x: 0, y: 0 });
  
  const [extinguisher, setExtinguisher] = useState<Character>({
    x: 200, y: 60, vx: 0, vy: 0, rotation: 0, scale: 1,
  });
  
  const [hoseReel, setHoseReel] = useState<Character>({
    x: 80, y: 60, vx: 0, vy: 0, rotation: 0, scale: 1,
  });
  
  const [fireParticles, setFireParticles] = useState<FireParticle[]>([]);
  const [waterDrops, setWaterDrops] = useState<WaterDrop[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  
  const particleIdRef = useRef(0);

  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handlePointerEnter = useCallback(() => setIsHovering(true), []);
  const handlePointerLeave = useCallback(() => setIsHovering(false), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    mousePos.current = { x: width / 2, y: height / 2 };
    lastMousePos.current = { x: width / 2, y: height / 2 };

    let ext = { ...extinguisher, x: width * 0.7, y: height / 2 };
    let hose = { ...hoseReel, x: width * 0.2, y: height / 2 };
    let particles: FireParticle[] = [];
    let drops: WaterDrop[] = [];

    const animate = () => {
      lastMousePos.current.x += (mousePos.current.x - lastMousePos.current.x) * 0.1;
      lastMousePos.current.y += (mousePos.current.y - lastMousePos.current.y) * 0.1;

      const mouse = lastMousePos.current;

      // === EXTINGUISHER - runs AWAY from cursor ===
      const extToMouse = { x: mouse.x - ext.x, y: mouse.y - ext.y };
      const extDist = Math.sqrt(extToMouse.x ** 2 + extToMouse.y ** 2);
      
      if (extDist > 0 && isHovering) {
        const fleeStrength = Math.max(0, 200 - extDist) / 200;
        ext.vx -= (extToMouse.x / extDist) * fleeStrength * 2.5;
        ext.vy -= (extToMouse.y / extDist) * fleeStrength * 2;
      }

      if (extDist < 150 && isHovering) {
        ext.vy += Math.sin(Date.now() / 50) * 0.3;
        ext.scale = 1 + Math.sin(Date.now() / 100) * 0.05;
      } else {
        ext.scale += (1 - ext.scale) * 0.1;
      }

      ext.vx *= 0.94;
      ext.vy *= 0.94;
      ext.x += ext.vx;
      ext.y += ext.vy;

      const padding = 40;
      if (ext.x < padding) { ext.x = padding; ext.vx *= -0.7; }
      if (ext.x > width - padding) { ext.x = width - padding; ext.vx *= -0.7; }
      if (ext.y < padding) { ext.y = padding; ext.vy *= -0.7; }
      if (ext.y > height - padding) { ext.y = height - padding; ext.vy *= -0.7; }

      ext.rotation += (ext.vx * 2 - ext.rotation) * 0.1;

      // === HOSE REEL - chases but keeps distance ===
      const hoseToExt = { x: ext.x - hose.x, y: ext.y - hose.y };
      const hoseDist = Math.sqrt(hoseToExt.x ** 2 + hoseToExt.y ** 2);

      const minDistance = 80;
      if (hoseDist > minDistance) {
        hose.vx += (hoseToExt.x / hoseDist) * 0.12;
        hose.vy += (hoseToExt.y / hoseDist) * 0.12;
      } else if (hoseDist < minDistance * 0.8) {
        hose.vx -= (hoseToExt.x / hoseDist) * 0.05;
        hose.vy -= (hoseToExt.y / hoseDist) * 0.05;
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

      // === FIRE PARTICLES ===
      if (Math.random() < 0.5) {
        particles.push({
          id: particleIdRef.current++,
          x: ext.x + (Math.random() - 0.5) * 18,
          y: ext.y - 18,
          vx: (Math.random() - 0.5) * 2 + ext.vx * 0.3,
          vy: -Math.random() * 3 - 1.5,
          life: 1,
          maxLife: 0.4 + Math.random() * 0.4,
          size: 4 + Math.random() * 8,
        });
      }

      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.08;
        p.life -= 0.03 / p.maxLife;
        p.size *= 0.96;
        return p.life > 0;
      });

      // === WATER SPRAY ===
      if (hoseDist < 130 && hoseDist > 50 && Math.random() < 0.65) {
        const angle = Math.atan2(hoseToExt.y, hoseToExt.x);
        const spread = (Math.random() - 0.5) * 0.5;
        drops.push({
          id: particleIdRef.current++,
          x: hose.x + Math.cos(angle) * 28,
          y: hose.y + Math.sin(angle) * 28,
          vx: Math.cos(angle + spread) * (4.5 + Math.random() * 2),
          vy: Math.sin(angle + spread) * (4.5 + Math.random() * 2),
          life: 1,
          size: 3 + Math.random() * 4,
        });
      }

      drops = drops.filter((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.12;
        d.life -= 0.04;
        return d.life > 0 && d.y < height + 10;
      });

      if (particles.length > 50) particles = particles.slice(-50);
      if (drops.length > 40) drops = drops.slice(-40);

      setExtinguisher({ ...ext });
      setHoseReel({ ...hose });
      setFireParticles([...particles]);
      setWaterDrops([...drops]);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isHovering]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-24 sm:h-28 md:h-32 overflow-hidden bg-gradient-to-b from-orange-50 via-white to-white border-b border-orange-200"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{ touchAction: 'none' }}
    >
      {/* Subtle pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#f97316 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Fire particles */}
      {fireParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            opacity: p.life * 0.9,
            background: `radial-gradient(circle, ${p.life > 0.7 ? '#fde047' : p.life > 0.4 ? '#f97316' : '#ef4444'} 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(0.5px)',
          }}
        />
      ))}

      {/* Water drops - blue to match fire safety theme */}
      {waterDrops.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size * 1.3,
            opacity: d.life * 0.85,
            background: 'linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%)',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          }}
        />
      ))}

      {/* Fire Extinguisher - RED body, on fire */}
      <div
        className="absolute pointer-events-none drop-shadow-md"
        style={{
          left: extinguisher.x,
          top: extinguisher.y,
          transform: `translate(-50%, -50%) rotate(${extinguisher.rotation}deg) scale(${extinguisher.scale})`,
        }}
      >
        <svg width="44" height="62" viewBox="0 0 50 70" fill="none">
          {/* Tank body */}
          <rect x="12" y="20" width="26" height="40" rx="4" fill="#dc2626" />
          <rect x="14" y="22" width="22" height="36" rx="3" fill="#ef4444" />
          <rect x="16" y="24" width="5" height="28" rx="2" fill="#fca5a5" opacity="0.6" />
          
          {/* Valve */}
          <rect x="18" y="12" width="14" height="10" rx="2" fill="#374151" />
          <rect x="20" y="8" width="10" height="6" rx="1" fill="#4b5563" />
          
          {/* Handle */}
          <path d="M32 14 Q40 14 40 22 L40 26 L36 26 L36 20 Q36 18 32 18 Z" fill="#4b5563" />
          
          {/* Hose */}
          <path d="M12 35 Q4 35 4 42 L4 52" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <circle cx="4" cy="52" r="2.5" fill="#4b5563" />
          
          {/* Label */}
          <rect x="17" y="32" width="16" height="18" rx="1" fill="#fefce8" />
          <text x="25" y="43" textAnchor="middle" fontSize="5.5" fill="#dc2626" fontWeight="bold">FIRE</text>
          <text x="25" y="48" textAnchor="middle" fontSize="3.5" fill="#a16207">EXT</text>
          
          {/* Eyes - panicked! */}
          <ellipse cx="19" cy="27" rx="2.5" ry="3.5" fill="white" />
          <ellipse cx="31" cy="27" rx="2.5" ry="3.5" fill="white" />
          <circle cx="20" cy="28" r="1.3" fill="#1f2937" />
          <circle cx="32" cy="28" r="1.3" fill="#1f2937" />
          {/* Worried eyebrows */}
          <path d="M16 24 L22 25.5" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M34 24 L28 25.5" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" />
          {/* Worried mouth */}
          <path d="M22 30 Q25 28 28 30" stroke="#1f2937" strokeWidth="1" fill="none" strokeLinecap="round" />
          
          {/* Sweat */}
          <path d="M35 22 Q37 19 36 24 Q35 26 35 22" fill="#60a5fa" />
          
          {/* Flames on top */}
          <g>
            <path d="M19 8 Q21 1 24 8 Q27 2 29 8" fill="#f97316" />
            <path d="M21 6 Q23 2 25 6" fill="#fde047" />
            <path d="M23 4 Q24 1 25 4" fill="#fef9c3" />
          </g>
        </svg>
      </div>

      {/* Hose Reel - ORANGE body, heroic */}
      <div
        className="absolute pointer-events-none drop-shadow-md"
        style={{
          left: hoseReel.x,
          top: hoseReel.y,
          transform: `translate(-50%, -50%)`,
        }}
      >
        <svg width="52" height="54" viewBox="0 0 60 60" fill="none">
          {/* Frame */}
          <rect x="10" y="15" width="40" height="28" rx="3" fill="#ea580c" />
          <rect x="12" y="17" width="36" height="24" rx="2" fill="#f97316" />
          
          {/* Highlight */}
          <rect x="14" y="19" width="8" height="18" rx="1" fill="#fdba74" opacity="0.5" />
          
          {/* Hose coil */}
          <circle cx="30" cy="29" r="9" fill="#1f2937" />
          <circle 
            cx="30" cy="29" r="7" fill="none" stroke="#374151" strokeWidth="2.5" strokeDasharray="3.5 1.5"
            style={{ transform: `rotate(${hoseReel.rotation}deg)`, transformOrigin: '30px 29px' }}
          />
          <circle cx="30" cy="29" r="2.5" fill="#f97316" />
          
          {/* Wheels */}
          <g style={{ transform: `rotate(${hoseReel.rotation}deg)`, transformOrigin: '15px 48px' }}>
            <circle cx="15" cy="48" r="5.5" fill="#374151" />
            <circle cx="15" cy="48" r="3.5" fill="#1f2937" />
            <circle cx="15" cy="48" r="1.2" fill="#6b7280" />
          </g>
          <g style={{ transform: `rotate(${hoseReel.rotation}deg)`, transformOrigin: '45px 48px' }}>
            <circle cx="45" cy="48" r="5.5" fill="#374151" />
            <circle cx="45" cy="48" r="3.5" fill="#1f2937" />
            <circle cx="45" cy="48" r="1.2" fill="#6b7280" />
          </g>
          
          {/* Handle */}
          <rect x="25" y="6" width="10" height="10" rx="2" fill="#374151" />
          <rect x="27" y="3" width="6" height="5" rx="1" fill="#1f2937" />
          
          {/* Nozzle */}
          <path d="M50 29 L57 29 L55 26.5 L57 29 L55 31.5 Z" fill="#374151" />
          
          {/* Eyes - determined */}
          <ellipse cx="23" cy="25" rx="2.5" ry="2.5" fill="white" />
          <ellipse cx="37" cy="25" rx="2.5" ry="2.5" fill="white" />
          <circle cx="24" cy="26" r="1.3" fill="#1f2937" />
          <circle cx="38" cy="26" r="1.3" fill="#1f2937" />
          
          {/* Determined eyebrows */}
          <path d="M20 21.5 L26 23" stroke="#1f2937" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M40 21.5 L34 23" stroke="#1f2937" strokeWidth="1.3" strokeLinecap="round" />
          
          {/* Confident smile */}
          <path d="M26 33 Q30 36.5 34 33" stroke="#1f2937" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Hint text */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs text-orange-400/70 pointer-events-none select-none font-medium tracking-wide">
        {isHovering ? "🔥 Run, little extinguisher, run!" : "Move cursor to play"}
      </div>
    </div>
  );
}

export default FireChaseAnimation;
