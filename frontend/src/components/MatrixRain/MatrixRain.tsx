import { useEffect, useRef, useCallback, useState } from 'react';
import './MatrixRain.css';

interface MatrixRainProps {
  isActive: boolean;
  isMinimized?: boolean;
  opacity?: number;
}

const MATRIX_TEXT = 'KENSENICHMANAGER';

export default function MatrixRain({ isActive, isMinimized = false, opacity = 1 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const dropsRef = useRef<number[]>([]);
  const columnsRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/small screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for sharp rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Adaptive font size based on screen/container size
    const baseFontSize = isMobile ? 12 : 14;
    const fontSize = Math.max(baseFontSize, Math.floor(rect.width / 40));
    columnsRef.current = Math.floor(rect.width / fontSize);

    // Store fontSize for draw function
    canvas.dataset.fontSize = String(fontSize);
    canvas.dataset.displayWidth = String(rect.width);
    canvas.dataset.displayHeight = String(rect.height);

    // Initialize drops at random positions
    dropsRef.current = [];
    for (let i = 0; i < columnsRef.current; i++) {
      dropsRef.current[i] = Math.random() * -50;
    }
  }, [isMobile]);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Throttle to ~30fps on mobile, ~60fps on desktop
    const targetFPS = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFPS;

    if (timestamp - lastFrameTimeRef.current < frameInterval) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }
    lastFrameTimeRef.current = timestamp;

    const fontSize = parseInt(canvas.dataset.fontSize || '14');
    const displayWidth = parseFloat(canvas.dataset.displayWidth || String(canvas.width));
    const displayHeight = parseFloat(canvas.dataset.displayHeight || String(canvas.height));
    const columns = columnsRef.current;
    const drops = dropsRef.current;

    // Fade effect - creates trail
    ctx.fillStyle = isMobile ? 'rgba(10, 10, 10, 0.08)' : 'rgba(10, 10, 10, 0.05)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Set text style
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;

    // Reduce shadow effects on mobile for performance
    const useShadow = !isMobile;

    for (let i = 0; i < columns; i++) {
      // Get character from KENSENICHMANAGER
      const charIndex = Math.floor(Math.random() * MATRIX_TEXT.length);
      const char = MATRIX_TEXT[charIndex];

      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // Create gradient effect - brighter at the head
      const brightness = Math.random();

      if (brightness > 0.95) {
        // Bright white head
        ctx.fillStyle = '#ffffff';
        if (useShadow) {
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 15;
        }
      } else if (brightness > 0.8) {
        // Bright green
        ctx.fillStyle = '#00ff88';
        if (useShadow) {
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 10;
        }
      } else {
        // Normal green with variable opacity
        ctx.fillStyle = `rgba(0, 255, 136, ${0.3 + brightness * 0.7})`;
        if (useShadow) {
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 5;
        }
      }

      ctx.fillText(char, x, y);

      // Reset shadow
      if (useShadow) {
        ctx.shadowBlur = 0;
      }

      // Move drop down
      if (y > displayHeight && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.4 + Math.random() * 0.4;
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [isMobile]);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Clear canvas with fade
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    initCanvas();
    animationRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      initCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, initCanvas, draw]);

  // Handle opacity changes for minimized state
  const computedOpacity = isMinimized ? opacity * 0.3 : opacity;

  if (!isActive) return null;

  return (
    <div
      className={`matrix-rain-container ${isMinimized ? 'minimized' : ''}`}
      style={{ opacity: computedOpacity }}
    >
      <canvas ref={canvasRef} className="matrix-rain-canvas" />
      <div className="matrix-overlay" />
    </div>
  );
}
