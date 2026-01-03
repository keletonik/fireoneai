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

    // Start them further apart to avoid overlap
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

      // Panic wobble when cursor is close
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

      // Bounce off walls
      const padding = 40;
      if (ext.x < padding) { ext.x = padding; ext.vx *= -0.7; }
      if (ext.x > width - padding) { ext.x = width - padding; ext.vx *= -0.7; }
      if (ext.y < padding) { ext.y = padding; ext.vy *= -0.7; }
      if (ext.y > height - padding) { ext.y = height - padding; ext.vy *= -0.7; }

      ext.rotation += (ext.vx * 2 - ext.rotation) * 0.1;

      // === HOSE REEL - chases the extinguisher but keeps distance ===
      const hoseToExt = { x: ext.x - hose.x, y: ext.y - hose.y };
      const hoseDist = Math.sqrt(hoseToExt.x ** 2 + hoseToExt.y ** 2);

      // Only chase if far enough apart, otherwise slow down
      const minDistance = 80;
      if (hoseDist > minDistance) {
        const chaseStrength = 0.12;
        hose.vx += (hoseToExt.x / hoseDist) * chaseStrength;
        hose.vy += (hoseToExt.y / hoseDist) * chaseStrength;
      } else if (hoseDist < minDistance * 0.8) {
        // Too close - back off slightly
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

      // === FIRE PARTICLES from extinguisher ===
      if (Math.random() < 0.5) {
        particles.push({
          id: particleIdRef.current++,
          x: ext.x + (Math.random() - 0.5) * 20,
          y: ext.y - 20,
          vx: (Math.random() - 0.5) * 2.5 + ext.vx * 0.3,
          vy: -Math.random() * 3.5 - 1.5,
          life: 1,
          maxLife: 0.5 + Math.random() * 0.5,
          size: 5 + Math.random() * 10,
        });
      }

      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.06;
        p.life -= 0.025 / p.maxLife;
        p.size *= 0.97;
        return p.life > 0;
      });

      // === FOAM DROPS from hose (orange/yellow to match theme) ===
      if (hoseDist < 140 && hoseDist > 50 && Math.random() < 0.7) {
        const angle = Math.atan2(hoseToExt.y, hoseToExt.x);
        const spread = (Math.random() - 0.5) * 0.6;
        drops.push({
          id: particleIdRef.current++,
          x: hose.x + Math.cos(angle) * 30,
          y: hose.y + Math.sin(angle) * 30,
          vx: Math.cos(angle + spread) * (5 + Math.random() * 2.5),
          vy: Math.sin(angle + spread) * (5 + Math.random() * 2.5),
          life: 1,
          size: 4 + Math.random() * 5,
        });
      }

      drops = drops.filter((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.12;
        d.life -= 0.035;
        return d.life > 0 && d.y < height + 10;
      });

      if (particles.length > 60) particles = particles.slice(-60);
      if (drops.length > 50) drops = drops.slice(-50);

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
      className="relative w-full h-32 md:h-36 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-orange-500/30"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{ touchAction: 'none' }}
    >
      {/* Subtle fire glow gradient */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, #f97316 0%, transparent 60%)',
        }}
      />

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #fb923c 1px, transparent 1px), linear-gradient(to bottom, #fb923c 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
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
            opacity: p.life,
            background: `radial-gradient(circle, ${p.life > 0.7 ? '#fef08a' : p.life > 0.4 ? '#fb923c' : '#ef4444'} 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* Foam drops - orange/yellow theme */}
      {waterDrops.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size * 1.2,
            opacity: d.life * 0.9,
            background: 'linear-gradient(180deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            boxShadow: '0 0 4px rgba(251, 146, 60, 0.5)',
          }}
        />
      ))}

      {/* Fire Extinguisher (on fire!) - RED theme */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: extinguisher.x,
          top: extinguisher.y,
          transform: `translate(-50%, -50%) rotate(${extinguisher.rotation}deg) scale(${extinguisher.scale})`,
        }}
      >
        <svg width="50" height="70" viewBox="0 0 50 70" fill="none">
          {/* Tank body - red */}
          <rect x="12" y="20" width="26" height="40" rx="4" fill="#dc2626" />
          <rect x="14" y="22" width="22" height="36" rx="3" fill="#ef4444" />
          <rect x="16" y="24" width="6" height="30" rx="2" fill="#fca5a5" opacity="0.5" />
          
          {/* Top valve - dark orange */}
          <rect x="18" y="12" width="14" height="10" rx="2" fill="#9a3412" />
          <rect x="20" y="8" width="10" height="6" rx="1" fill="#c2410c" />
          
          {/* Handle */}
          <path d="M32 14 Q40 14 40 22 L40 26 L36 26 L36 20 Q36 18 32 18 Z" fill="#c2410c" />
          
          {/* Hose */}
          <path d="M12 35 Q4 35 4 42 L4 55" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="4" cy="55" r="3" fill="#9a3412" />
          
          {/* Label */}
          <rect x="17" y="32" width="16" height="20" rx="1" fill="#fef3c7" />
          <text x="25" y="44" textAnchor="middle" fontSize="6" fill="#dc2626" fontWeight="bold">FIRE</text>
          <text x="25" y="50" textAnchor="middle" fontSize="4" fill="#92400e">EXT</text>
          
          {/* Panicked eyes */}
          <ellipse cx="19" cy="28" rx="3" ry="4" fill="white" />
          <ellipse cx="31" cy="28" rx="3" ry="4" fill="white" />
          <circle cx="20" cy="29" r="1.5" fill="#1f2937" />
          <circle cx="32" cy="29" r="1.5" fill="#1f2937" />
          
          {/* Sweat drop */}
          <path d="M36 24 Q38 20 37 26 Q36 28 36 24" fill="#fcd34d" />
          
          {/* Flames on top */}
          <g className="animate-pulse">
            <path d="M20 8 Q22 0 25 8 Q28 2 30 8" fill="#f97316" />
            <path d="M23 5 Q25 1 27 5" fill="#fef08a" />
          </g>
        </svg>
      </div>

      {/* Hose Reel (hero) - ORANGE/SALMON theme */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: hoseReel.x,
          top: hoseReel.y,
          transform: `translate(-50%, -50%)`,
        }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          {/* Frame - salmon/coral */}
          <rect x="10" y="15" width="40" height="30" rx="3" fill="#ea580c" />
          <rect x="12" y="17" width="36" height="26" rx="2" fill="#f97316" />
          
          {/* Hose coil */}
          <circle cx="30" cy="30" r="10" fill="#7c2d12" />
          <circle 
            cx="30" cy="30" r="8" fill="none" stroke="#9a3412" strokeWidth="3" strokeDasharray="4 2"
            style={{ transform: `rotate(${hoseReel.rotation}deg)`, transformOrigin: '30px 30px' }}
          />
          <circle cx="30" cy="30" r="3" fill="#fbbf24" />
          
          {/* Wheels - dark red/brown */}
          <g style={{ transform: `rotate(${hoseReel.rotation}deg)`, transformOrigin: '15px 50px' }}>
            <circle cx="15" cy="50" r="6" fill="#7c2d12" />
            <circle cx="15" cy="50" r="4" fill="#451a03" />
            <circle cx="15" cy="50" r="1.5" fill="#a16207" />
          </g>
          <g style={{ transform: `rotate(${hoseReel.rotation}deg)`, transformOrigin: '45px 50px' }}>
            <circle cx="45" cy="50" r="6" fill="#7c2d12" />
            <circle cx="45" cy="50" r="4" fill="#451a03" />
            <circle cx="45" cy="50" r="1.5" fill="#a16207" />
          </g>
          
          {/* Handle */}
          <rect x="25" y="5" width="10" height="12" rx="2" fill="#9a3412" />
          <rect x="27" y="2" width="6" height="5" rx="1" fill="#7c2d12" />
          
          {/* Nozzle */}
          <path d="M50 30 L58 30 L56 27 L58 30 L56 33 Z" fill="#fbbf24" />
          
          {/* Determined face */}
          <ellipse cx="23" cy="26" rx="3" ry="3" fill="white" />
          <ellipse cx="37" cy="26" rx="3" ry="3" fill="white" />
          <circle cx="24" cy="27" r="1.5" fill="#1f2937" />
          <circle cx="38" cy="27" r="1.5" fill="#1f2937" />
          
          {/* Determined eyebrows */}
          <path d="M20 22 L26 24" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M40 22 L34 24" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Smile */}
          <path d="M26 34 Q30 38 34 34" stroke="#451a03" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-orange-400/60 pointer-events-none select-none font-medium">
        {isHovering ? "🔥 Run, little extinguisher, run!" : "Move cursor to chase"}
      </div>
    </div>
  );
}

export default FireChaseAnimation;
