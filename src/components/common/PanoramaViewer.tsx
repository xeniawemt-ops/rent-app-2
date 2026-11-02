import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Layers,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera
} from 'lucide-react';

export interface PanoramaViewerProps {
  photos: string[];
  initialIndex?: number;
  propertyTitle?: string;
  onClose?: () => void;
  className?: string;
}

export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
  photos,
  initialIndex = 0,
  propertyTitle = 'Property Tour',
  onClose,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const currentTextureRef = useRef<THREE.Texture | null>(null);

  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(initialIndex);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showHelpHint, setShowHelpHint] = useState<boolean>(true);
  const [headingDegrees, setHeadingDegrees] = useState<number>(0);
  const [pitchDegrees, setPitchDegrees] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(75);

  // Interaction tracking refs
  const isUserInteractingRef = useRef<boolean>(false);
  const onPointerDownPointerXRef = useRef<number>(0);
  const onPointerDownPointerYRef = useRef<number>(0);
  const onPointerDownLonRef = useRef<number>(0);
  const onPointerDownLatRef = useRef<number>(0);
  const lonRef = useRef<number>(0);
  const latRef = useRef<number>(0);
  const isAutoRotatingRef = useRef<boolean>(true);
  const pinchStartDistRef = useRef<number | null>(null);
  const initialFovRef = useRef<number>(75);

  // Synchronize autoRotate ref
  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  // Load and apply texture onto the sphere
  const applyTexture = useCallback((imageUrl: string) => {
    if (!sceneRef.current || !meshRef.current) return;

    setIsLoading(true);
    setLoadError(null);

    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        // Dispose previous texture if any
        if (currentTextureRef.current) {
          currentTextureRef.current.dispose();
        }
        currentTextureRef.current = texture;

        if (meshRef.current) {
          const material = meshRef.current.material as THREE.MeshBasicMaterial;
          material.map = texture;
          material.needsUpdate = true;
        }

        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load 360 panorama texture:', err);
        setLoadError('Failed to load panorama image. Please check network connectivity.');
        setIsLoading(false);
      }
    );
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    cameraRef.current = camera;

    // 2. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 3. Inverted Sphere geometry (camera inside looking out)
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    // Invert geometry so normals point inwards
    geometry.scale(-1, 1, 1);

    // Initial placeholder material
    const material = new THREE.MeshBasicMaterial({
      color: 0x1c1917, // Dark stone placeholder
      side: THREE.DoubleSide,
    });

    const sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);
    meshRef.current = sphereMesh;

    // 4. WebGL Renderer with performance flags
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e: any) {
      setLoadError('WebGL is not supported or was disabled in your browser.');
      return;
    }

    // Load initial texture
    if (photos[activePhotoIdx]) {
      applyTexture(photos[activePhotoIdx]);
    }

    // 5. Animation Render Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Auto-rotation when user is not manually interacting
      if (isAutoRotatingRef.current && !isUserInteractingRef.current) {
        lonRef.current += 10 * delta; // 10 degrees per second
      }

      // Clamp latitude to prevent flipping
      latRef.current = Math.max(-85, Math.min(85, latRef.current));

      // Calculate spherical coordinates
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      const targetX = 500 * Math.sin(phi) * Math.cos(theta);
      const targetY = 500 * Math.cos(phi);
      const targetZ = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(targetX, targetY, targetZ);
      renderer.render(scene, camera);

      // Periodically update compass / HUD metrics
      const normLon = ((lonRef.current % 360) + 360) % 360;
      setHeadingDegrees(Math.round(normLon));
      setPitchDegrees(Math.round(latRef.current));
      setZoomLevel(Math.round(camera.fov));
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 6. Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        }
      }
    });

    resizeObserver.observe(container);

    // Fade out help hint after 5 seconds
    const hintTimer = setTimeout(() => {
      setShowHelpHint(false);
    }, 5000);

    // Cleanup resources on unmount
    return () => {
      clearTimeout(hintTimer);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();

      if (currentTextureRef.current) {
        currentTextureRef.current.dispose();
      }
      geometry.dispose();
      material.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // Update texture when activePhotoIdx changes
  useEffect(() => {
    if (photos[activePhotoIdx]) {
      applyTexture(photos[activePhotoIdx]);
    }
  }, [activePhotoIdx, photos, applyTexture]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary mouse button
    isUserInteractingRef.current = true;
    onPointerDownPointerXRef.current = e.clientX;
    onPointerDownPointerYRef.current = e.clientY;
    onPointerDownLonRef.current = lonRef.current;
    onPointerDownLatRef.current = latRef.current;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isUserInteractingRef.current) return;

    const deltaX = e.clientX - onPointerDownPointerXRef.current;
    const deltaY = e.clientY - onPointerDownPointerYRef.current;

    // Sensitivity factor based on current FOV (smoother when zoomed in)
    const currentFov = cameraRef.current ? cameraRef.current.fov : 75;
    const factor = (currentFov / 75) * 0.15;

    lonRef.current = onPointerDownLonRef.current - deltaX * factor;
    latRef.current = onPointerDownLatRef.current + deltaY * factor;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isUserInteractingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!cameraRef.current) return;

    const zoomSpeed = 0.05;
    const nextFov = THREE.MathUtils.clamp(
      cameraRef.current.fov + e.deltaY * zoomSpeed,
      30,
      100
    );

    cameraRef.current.fov = nextFov;
    cameraRef.current.updateProjectionMatrix();
    setZoomLevel(Math.round(nextFov));
  };

  // Touch handlers for mobile pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      initialFovRef.current = cameraRef.current ? cameraRef.current.fov : 75;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null && cameraRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const ratio = pinchStartDistRef.current / currentDist;

      const newFov = THREE.MathUtils.clamp(initialFovRef.current * ratio, 30, 100);
      cameraRef.current.fov = newFov;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(Math.round(newFov));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  // Zoom control buttons
  const adjustZoom = (delta: number) => {
    if (!cameraRef.current) return;
    const nextFov = THREE.MathUtils.clamp(cameraRef.current.fov + delta, 30, 100);
    cameraRef.current.fov = nextFov;
    cameraRef.current.updateProjectionMatrix();
    setZoomLevel(Math.round(nextFov));
  };

  const resetOrientation = () => {
    lonRef.current = 0;
    latRef.current = 0;
    if (cameraRef.current) {
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(75);
    }
  };

  // Fullscreen toggle for immersive walkthrough
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 8;
    if (e.key === 'ArrowLeft') {
      lonRef.current -= step;
    } else if (e.key === 'ArrowRight') {
      lonRef.current += step;
    } else if (e.key === 'ArrowUp') {
      latRef.current += step;
    } else if (e.key === 'ArrowDown') {
      latRef.current -= step;
    } else if (e.key === '+' || e.key === '=') {
      adjustZoom(-5);
    } else if (e.key === '-' || e.key === '_') {
      adjustZoom(5);
    } else if (e.key === 'r' || e.key === 'R') {
      resetOrientation();
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsAutoRotating((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-80 sm:h-96 md:h-[420px] bg-stone-950 overflow-hidden select-none cursor-grab active:cursor-grabbing focus:outline-hidden group ${className}`}
      aria-label="360 Degree Virtual Tour Panorama Viewer"
    >
      {/* 360 Top HUD Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
        {/* Left: 360 Badge & Property Title */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-semibold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>360° Virtual Tour</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-stone-300 text-xs font-mono">
            <Camera className="w-3 h-3 text-stone-400" />
            <span>Room {activePhotoIdx + 1} of {photos.length}</span>
          </div>
        </div>

        {/* Right: Controls Strip */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Compass / Orientation display */}
          <button
            type="button"
            onClick={resetOrientation}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-stone-300 text-[11px] font-mono transition-colors shadow-xs cursor-pointer"
            title="Reset perspective to 0°"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" style={{ transform: `rotate(${-headingDegrees}deg)` }} />
            <span>{headingDegrees}°</span>
          </button>

          {/* Auto-rotation Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAutoRotating((prev) => !prev);
            }}
            className={`p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer shadow-xs ${
              isAutoRotating
                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                : 'bg-black/60 hover:bg-black/80 border-white/15 text-stone-300'
            }`}
            title={isAutoRotating ? 'Pause 360° Auto-Rotation (Space)' : 'Start 360° Auto-Rotation (Space)'}
            aria-label="Toggle Auto Rotation"
          >
            {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              adjustZoom(-10);
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              adjustZoom(10);
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Zoom Out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Re-center */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetOrientation();
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Center View (R)"
            aria-label="Reset orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-stone-300 hover:text-white transition-colors cursor-pointer shadow-xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Immersive Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Loading Spinner Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-stone-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
          <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-3" />
          <span className="text-xs font-medium tracking-wide text-amber-200">
            Rendering 360° Panorama Sphere...
          </span>
          <span className="text-[10px] text-stone-400 font-mono mt-1">
            Applying equirectangular projection
          </span>
        </div>
      )}

      {/* Error Fallback */}
      {loadError && (
        <div className="absolute inset-0 z-30 bg-stone-950/90 flex flex-col items-center justify-center text-white p-6 text-center">
          <Info className="w-8 h-8 text-rose-400 mb-2" />
          <p className="text-xs text-rose-200 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => photos[activePhotoIdx] && applyTexture(photos[activePhotoIdx])}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-full text-xs font-medium transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Floating Interactive Guide Hint */}
      {showHelpHint && !isLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in duration-300">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-stone-200 text-xs shadow-xl">
            <span className="text-amber-400 text-sm">✦</span>
            <span>Click &amp; drag or swipe to look around 360° &bull; Scroll to zoom</span>
          </div>
        </div>
      )}

      {/* Room / Photo Navigation Controls (Left & Right Chevrons) */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer z-20"
            title="Previous Room View"
            aria-label="Previous Room"
          >
            <ChevronLeft className="w-5 h-5 -ml-0.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer z-20"
            title="Next Room View"
            aria-label="Next Room"
          >
            <ChevronRight className="w-5 h-5 -mr-0.5" />
          </button>
        </>
      )}

      {/* Bottom Room / Angle Selector Strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 shadow-xl max-w-full overflow-x-auto no-scrollbar pointer-events-auto">
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider hidden sm:inline mr-1">
              Rooms:
            </span>
            {photos.map((photoUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx(idx);
                }}
                className={`relative shrink-0 w-12 h-9 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  activePhotoIdx === idx
                    ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-md opacity-100'
                    : 'border-stone-700/80 opacity-60 hover:opacity-100 hover:border-stone-400'
                }`}
                title={`Switch to Room View ${idx + 1}`}
                aria-label={`Room View ${idx + 1}`}
              >
                <img
                  src={photoUrl}
                  alt={`Room ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0.5 right-0.5 text-[8px] font-mono bg-black/80 text-white px-1 rounded">
                  #{idx + 1}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
