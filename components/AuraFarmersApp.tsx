"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Camera,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Zap,
  Flame,
  Award,
  VideoOff,
  RefreshCw,
  Trophy
} from "lucide-react";
import { sounds } from "@/lib/audio";
import { Gesture67Tracker, HAND_CONNECTIONS, ScaleState } from "@/lib/gestureDetector";
import { RANKS, getRank, getNextRank, AuraRank } from "@/lib/ranks";

interface FloatingPoint {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  color: string;
}

export default function AuraFarmersApp() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const trackerRef = useRef<Gesture67Tracker>(new Gesture67Tracker());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handLandmarkerRef = useRef<any>(null);

  // App States
  const [cameraPermission, setCameraPermission] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Farming Stats
  const [auraPoints, setAuraPoints] = useState<number>(0);
  const [gesturesCount, setGesturesCount] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [highestStreak, setHighestStreak] = useState<number>(0);
  const [lastGestureType, setLastGestureType] = useState<string | null>(null);

  // Real-time tracking HUD state
  const [scaleState, setScaleState] = useState<ScaleState>({
    tilt: "neutral",
    deltaY: 0,
    normalizedDelta: 0,
    leftY: 0.5,
    rightY: 0.5,
    handsCount: 0,
    leftHandIndex: -1,
    rightHandIndex: -1,
    progressPercent: 0,
    statusText: "Coloca ambas manos en la cámara"
  });

  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rankRef = useRef<AuraRank>(RANKS[0]);

  // Load points from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aurafarmers_points");
      const savedCount = localStorage.getItem("aurafarmers_count");
      if (saved) setAuraPoints(parseInt(saved, 10) || 0);
      if (savedCount) setGesturesCount(parseInt(savedCount, 10) || 0);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aurafarmers_points", auraPoints.toString());
      localStorage.setItem("aurafarmers_count", gesturesCount.toString());
    }
  }, [auraPoints, gesturesCount]);

  // Handle sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  // Trigger floating particle
  const triggerParticle = (text: string, x: number, y: number) => {
    const newPoint: FloatingPoint = {
      id: Date.now() + Math.random(),
      text,
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(80, y)),
      opacity: 1,
      color: "#22d3ee"
    };

    setFloatingPoints((prev) => [...prev.slice(-6), newPoint]);

    setTimeout(() => {
      setFloatingPoints((prev) => prev.filter((p) => p.id !== newPoint.id));
    }, 1200);
  };

  // Handle successful 67 gesture
  const on67Achieved = useCallback((type: "scale_67" | "finger_67", xPercent: number, yPercent: number) => {
    setCombo((prevCombo) => {
      const nextCombo = prevCombo + 1;
      const nextMultiplier = Math.min(5, 1 + Math.floor(nextCombo / 3));
      const addedPoints = 67 * nextMultiplier;

      setMultiplier(nextMultiplier);
      setAuraPoints((prevPoints) => {
        const newTotal = prevPoints + addedPoints;
        const currentRank = getRank(newTotal);

        // Check if rank increased
        if (currentRank.name !== rankRef.current.name && newTotal > rankRef.current.minPoints) {
          rankRef.current = currentRank;
          sounds.playRankUp();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        return newTotal;
      });

      setGesturesCount((c) => c + 1);
      setHighestStreak((h) => Math.max(h, nextCombo));
      setLastGestureType(type === "scale_67" ? "⚖️ 6 7 BALANZA" : "🔥 6 7 DEDOS");

      // Audio feedback
      if (nextCombo > 2) {
        sounds.playComboSound(nextCombo);
      } else {
        sounds.play67Detected(nextMultiplier);
      }

      // Haptics if available
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 25, 45]);
      }

      // Visual particle
      const label = nextMultiplier > 1 ? `+${addedPoints} AURA (x${nextMultiplier})! ⚡` : `+67 AURA! ✨`;
      triggerParticle(label, xPercent, yPercent);

      // Reset or extend combo timeout
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        setCombo(0);
        setMultiplier(1);
      }, 3500);

      return nextCombo;
    });
  }, []);

  // Request Camera automatically on entry
  const initCamera = useCallback(async () => {
    try {
      setCameraPermission("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraPermission("granted");
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraPermission("denied");
    }
  }, []);

  // Initialize MediaPipe Vision Hand Landmarker
  const initHandLandmarker = useCallback(async () => {
    try {
      setModelLoading(true);
      setModelError(null);

      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");

      // Try local WASM first, fallback to CDN if needed
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks("/wasm");
      } catch {
        vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
      }

      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handLandmarkerRef.current = landmarker;
      setModelLoading(false);
    } catch (err: unknown) {
      console.error("Error loading MediaPipe model:", err);
      // Fallback try with CDN model url
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        handLandmarkerRef.current = landmarker;
        setModelLoading(false);
      } catch (fallbackErr) {
        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        setModelError(msg || "No se pudo cargar el modelo de visión.");
        setModelLoading(false);
      }
    }
  }, []);

  // Auto request camera on entry as requested
  useEffect(() => {
    initCamera();
    initHandLandmarker();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, [initCamera, initHandLandmarker]);

  // Main Detection & Render Loop
  useEffect(() => {
    if (cameraPermission !== "granted" || modelLoading || !handLandmarkerRef.current) {
      return;
    }

    let lastVideoTime = -1;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && handLandmarkerRef.current) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const currentTime = video.currentTime;
          if (currentTime !== lastVideoTime) {
            lastVideoTime = currentTime;
            const startTimeMs = performance.now();

            try {
              const detections = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

              if (detections && detections.landmarks) {
                const hands = detections.landmarks;

                // Process through 67 tracker
                const { scaleState: updatedScale, result } = trackerRef.current.process(
                  hands,
                  canvas.width,
                  canvas.height
                );

                setScaleState(updatedScale);

                if (result && result.detected && result.type) {
                  // Mirror x coordinate for mirrored video view
                  const xPercent = (1 - (result.handX || canvas.width / 2) / canvas.width) * 100;
                  const yPercent = ((result.handY || canvas.height / 2) / canvas.height) * 100;
                  on67Achieved(result.type, xPercent, yPercent);
                }

                // Draw Hand Skeletons with glowing Aura aesthetic
                hands.forEach((landmarks: { x: number; y: number }[], handIdx: number) => {
                  const isLeft = handIdx === updatedScale.leftHandIndex;
                  const handColor = isLeft ? "#06b6d4" : "#a855f7"; // Cyan or Purple Aura
                  const jointGlow = isLeft ? "rgba(34, 211, 238, 0.8)" : "rgba(192, 132, 252, 0.8)";

                  // Draw connection bones
                  ctx.lineWidth = 3.5;
                  ctx.strokeStyle = handColor;
                  ctx.lineCap = "round";
                  ctx.shadowColor = handColor;
                  ctx.shadowBlur = 12;

                  HAND_CONNECTIONS.forEach(([i, j]) => {
                    const p1 = landmarks[i];
                    const p2 = landmarks[j];
                    if (p1 && p2) {
                      ctx.beginPath();
                      // Mirror X for intuitive natural video feedback
                      ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
                      ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
                      ctx.stroke();
                    }
                  });

                  // Draw joints
                  landmarks.forEach((p, idx) => {
                    const x = (1 - p.x) * canvas.width;
                    const y = p.y * canvas.height;
                    const radius = idx === 0 || idx === 8 || idx === 12 ? 6.5 : 4.5;

                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = jointGlow;
                    ctx.shadowColor = "#ffffff";
                    ctx.shadowBlur = 15;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(x, y, radius - 2, 0, 2 * Math.PI);
                    ctx.fillStyle = "#ffffff";
                    ctx.fill();
                  });

                  // Draw Hand Aura indicator above wrist
                  const wrist = landmarks[0];
                  if (wrist) {
                    const wx = (1 - wrist.x) * canvas.width;
                    const wy = wrist.y * canvas.height + 25;
                    ctx.shadowBlur = 8;
                    ctx.font = "bold 13px system-ui, sans-serif";
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "center";
                    ctx.fillText(isLeft ? "MANO 6" : "MANO 7", wx, wy);
                  }
                });
              } else {
                setScaleState((prev) => ({
                  ...prev,
                  statusText: "Coloca ambas manos frente a la cámara",
                  progressPercent: 0
                }));
              }
            } catch (procErr) {
              console.error("Frame process error:", procErr);
            }
          }
        }
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [cameraPermission, modelLoading, on67Achieved]);

  const currentRank = getRank(auraPoints);
  const nextRank = getNextRank(auraPoints);
  const progressToNextRank = nextRank
    ? Math.min(100, Math.round(((auraPoints - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100))
    : 100;

  const resetStats = () => {
    if (confirm("¿Reiniciar tus puntos de Aura a 0?")) {
      setAuraPoints(0);
      setGesturesCount(0);
      setCombo(0);
      setMultiplier(1);
      trackerRef.current.reset();
      localStorage.removeItem("aurafarmers_points");
      localStorage.removeItem("aurafarmers_count");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-white flex flex-col items-center justify-between overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Top Header / HUD */}
      <header className="w-full max-w-6xl z-20 px-4 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 font-black text-xl">
            67
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                AURA FARMERS <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">6 7</span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium">Farmea Aura infinita haciendo el mítico gesto 6 7</p>
          </div>
        </div>

        {/* Global Stats Counter */}
        <div className="flex items-center gap-3 sm:gap-6 bg-zinc-900/90 border border-zinc-800 px-4 py-2 rounded-2xl shadow-inner">
          <div className="text-center sm:text-left">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">Puntos Aura</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
                {auraPoints.toLocaleString()}
              </span>
              <span className="text-xs text-cyan-400 font-mono font-bold">PTS</span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

          {/* Current Rank Badge */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentRank.emoji}</span>
            <div className="hidden sm:block">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Rango Actual</span>
              <span className={`text-sm font-bold ${currentRank.color}`}>{currentRank.name}</span>
            </div>
          </div>

          {/* Combo Indicator */}
          {combo > 1 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-bounce">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black tracking-wide">x{multiplier} COMBO ({combo})</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? "Silenciar sonido" : "Activar sonido"}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title={soundEnabled ? "Sonido Activado" : "Sonido Silenciado"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          <button
            onClick={() => setShowHelp(true)}
            aria-label="Cómo jugar"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">¿Cómo hacer 6 7?</span>
          </button>

          <button
            onClick={resetStats}
            aria-label="Reiniciar puntuación"
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Reiniciar Puntuación"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Farm Center */}
      <main className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center p-4 gap-4 z-10">
        {/* Permission Request Alert if denied */}
        {cameraPermission === "denied" && (
          <div className="w-full max-w-2xl bg-rose-950/80 border border-rose-500/50 p-6 rounded-3xl text-center flex flex-col items-center gap-3 backdrop-blur-xl">
            <VideoOff className="w-12 h-12 text-rose-400" />
            <h2 className="text-lg font-bold text-white">Acceso a la Cámara Denegado</h2>
            <p className="text-sm text-rose-200/80 max-w-md">
              Aura Farmers necesita tu cámara para detectar tus movimientos y registrar cada vez que haces el gesto 6 7.
            </p>
            <button
              onClick={initCamera}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition shadow-lg shadow-rose-600/30"
            >
              <RefreshCw className="w-4 h-4" /> Intentar de nuevo
            </button>
          </div>
        )}

        {/* Permission Pending / Prompt Overlay */}
        {cameraPermission === "idle" && (
          <div className="w-full max-w-xl bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl text-center flex flex-col items-center gap-4 backdrop-blur-xl shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">Permite tu Cámara para Farmear</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Para validar tus 6 7 en tiempo real con visión por computadora local, activa los permisos de cámara.
            </p>
            <button
              onClick={initCamera}
              className="mt-2 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5" /> Activar Cámara y Empezar
            </button>
          </div>
        )}

        {/* Active Camera Viewport */}
        {(cameraPermission === "granted" || cameraPermission === "requesting") && (
          <div className="relative w-full max-w-3xl aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden bg-black border-2 border-zinc-800/80 shadow-2xl shadow-cyan-950/40 flex items-center justify-center">
            {/* Live Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />

            {/* AI Vision Skeleton Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />

            {/* Loading AI Model Overlay */}
            {modelLoading && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold text-cyan-300">Cargando detector de manos 6 7...</span>
                <span className="text-xs text-zinc-400">Procesando localmente en tu navegador</span>
              </div>
            )}

            {/* Model Error if any */}
            {modelError && (
              <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center gap-3 z-30 text-center">
                <span className="text-rose-400 font-bold">Error cargando detector</span>
                <span className="text-xs text-zinc-400 max-w-md">{modelError}</span>
                <button
                  onClick={initHandLandmarker}
                  className="px-4 py-2 bg-zinc-800 text-xs rounded-xl hover:bg-zinc-700 font-medium"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Floating Aura Points Popups */}
            {floatingPoints.map((p) => (
              <div
                key={p.id}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: "translate(-50%, -50%)"
                }}
                className="absolute z-20 pointer-events-none text-xl sm:text-2xl font-black drop-shadow-[0_4px_16px_rgba(34,211,238,0.8)] animate-out fade-out slide-out-to-top duration-1000 select-none text-cyan-300"
              >
                {p.text}
              </div>
            ))}

            {/* In-Video HUD: The Real-Time 6 7 Seesaw Meter */}
            {!modelLoading && (
              <div className="absolute bottom-4 inset-x-4 z-20 flex flex-col items-center gap-2">
                {/* Visual Seesaw Balance Bar */}
                <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-md border border-zinc-700/60 p-3 rounded-2xl shadow-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className={`flex items-center gap-1 ${scaleState.tilt === "left_up" ? "text-cyan-400 font-black" : "text-zinc-400"}`}>
                      👈 MANO IZQUIERDA {scaleState.tilt === "left_up" && "▲"}
                    </span>
                    <span className="text-purple-300 tracking-wide font-mono text-[10px]">BALANZA 6 7</span>
                    <span className={`flex items-center gap-1 ${scaleState.tilt === "right_up" ? "text-purple-400 font-black" : "text-zinc-400"}`}>
                      {scaleState.tilt === "right_up" && "▲"} MANO DERECHA 👉
                    </span>
                  </div>

                  {/* Tilting Indicator Gauge */}
                  <div className="relative w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-y-0 w-0.5 bg-zinc-500 z-10" />
                    {/* Tilt indicator marker */}
                    <div
                      style={{
                        left: `${50 + scaleState.normalizedDelta * 40}%`,
                        transition: "left 100ms ease-out"
                      }}
                      className={`absolute w-5 h-5 rounded-full -translate-x-1/2 border-2 border-white shadow-md ${
                        scaleState.tilt === "neutral"
                          ? "bg-zinc-400"
                          : scaleState.tilt === "left_up"
                          ? "bg-cyan-400 shadow-cyan-500/50"
                          : "bg-purple-400 shadow-purple-500/50"
                      }`}
                    />
                  </div>

                  {/* Status Instruction Bar */}
                  <div className="text-center text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>{scaleState.statusText}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rank Progression Bar */}
        <div className="w-full max-w-3xl bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-2 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Rango: <span className={currentRank.color}>{currentRank.name}</span></span>
            </div>
            {nextRank ? (
              <span className="text-zinc-400">
                Siguiente: <strong className="text-zinc-200">{nextRank.name}</strong> ({nextRank.minPoints - auraPoints} pts faltantes)
              </span>
            ) : (
              <span className="text-fuchsia-400 font-bold">¡RANGO MÁXIMO ALCANZADO! 👑</span>
            )}
          </div>

          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${progressToNextRank}%` }}
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-purple-500 transition-all duration-300"
            />
          </div>

          <p className="text-[11px] text-zinc-400 italic text-center">
            &ldquo;{currentRank.tagline}&rdquo;
          </p>
        </div>

        {/* Stats Row */}
        <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">6 7 Completados</span>
            <span className="text-xl font-black text-white">{gesturesCount}</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Mejor Racha</span>
            <span className="text-xl font-black text-cyan-400">{highestStreak} 🔥</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Multiplicador</span>
            <span className="text-xl font-black text-amber-400">x{multiplier}</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Último Gesto</span>
            <span className="text-sm font-bold text-purple-300 truncate block mt-1">
              {lastGestureType || "Esperando..."}
            </span>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl px-4 py-4 text-center text-xs text-zinc-500 border-t border-zinc-900 z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>Aura Farmers © 2026 • Visión artificial ejecutada 100% en tu dispositivo</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-zinc-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> +67 Aura por cada balanceo
          </span>
        </div>
      </footer>

      {/* How to Play Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" /> ¿Cómo hacer el 6 7?
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-zinc-300">
              <div className="flex gap-3 items-start bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-white">El Gesto Viral de la Balanza (6 7)</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Coloca <strong>ambas manos</strong> con las palmas abiertas hacia el frente o hacia arriba.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-white">Alterna Arriba y Abajo</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Sube una mano mientras bajas la otra, y luego invierte la posición (como pesando dos objetos en una balanza). Cada ciclo completo suma <strong>+67 Puntos Aura</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-white">Combo de Dedos 6 y 7</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    También puedes mostrar 6 dedos con tus manos y rápidamente mostrar 7 dedos para desbloquear un bonus especial de Aura.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-white">Multiplicador y Racha</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Si mantienes el ritmo sin detenerte, multiplicarás tus puntos hasta x5 (¡+335 Aura por balanceo!).
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 font-bold text-sm text-white shadow-lg shadow-cyan-500/25 transition"
            >
              ¡Entendido, a Farmear!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
