"use client";

import React, { useEffect, useRef, useCallback, RefObject } from "react";
import { Camera, CameraOff } from "lucide-react";
import { CameraStatus } from "@/hooks/useCamera";
import { Gesture67Tracker, HAND_CONNECTIONS } from "@/lib/gestureDetector";

export interface FloatingPoint {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface GameCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  modelLoading: boolean;
  modelError: string | null;
  combo: number;
  isBlurred?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handLandmarkerRef: RefObject<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  faceDetectorRef: RefObject<any>;
  floatingPoints: FloatingPoint[];
  burstUntil: number;
  on67Achieved: (xPercent: number, yPercent: number, canvasX: number, canvasY: number) => void;
  onStartCamera: () => void;
  onRetryModel: () => void;
}

// Generate jagged lightning path with midpoint displacement
function createLightningPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displacement: number,
  iterations = 4
): { x: number; y: number }[] {
  let points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  let disp = displacement;

  for (let it = 0; it < iterations; it++) {
    const nextPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const offset = (Math.random() - 0.5) * disp;

      nextPoints.push(p1);
      nextPoints.push({ x: midX + nx * offset, y: midY + ny * offset });
    }
    nextPoints.push(points[points.length - 1]);
    points = nextPoints;
    disp *= 0.55;
  }

  return points;
}

export default function GameCanvas({
  videoRef,
  cameraStatus,
  modelLoading,
  modelError,
  combo,
  isBlurred = false,
  handLandmarkerRef,
  faceDetectorRef,
  floatingPoints,
  burstUntil,
  on67Achieved,
  onStartCamera,
  onRetryModel,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const trackerRef = useRef<Gesture67Tracker>(new Gesture67Tracker());
  const fireParticlesRef = useRef<FireParticle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const lastEyesRef = useRef<{
    left: { x: number; y: number };
    right: { x: number; y: number };
    time: number;
  } | null>(null);

  const comboRef = useRef(combo);
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const burstUntilRef = useRef(burstUntil);
  useEffect(() => {
    burstUntilRef.current = burstUntil;
  }, [burstUntil]);

  const handleScore = useCallback(
    (xPercent: number, yPercent: number, canvasX: number, canvasY: number) => {
      const currentCombo = comboRef.current;
      const isPlasma = currentCombo >= 5;

      // Spawn fiery burst particles
      const count = Math.min(45, 16 + currentCombo * 5);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.5 + Math.random() * 9.5;
        fireParticlesRef.current.push({
          x: canvasX + (Math.random() - 0.5) * 35,
          y: canvasY + (Math.random() - 0.5) * 35,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.2,
          size: 18 + Math.random() * 28 + currentCombo * 2,
          life: 0,
          maxLife: 22 + Math.random() * 20,
          hue: isPlasma ? 275 + Math.random() * 55 : 12 + Math.random() * 40,
        });
      }

      // Add shockwave ring
      shockwavesRef.current.push({
        x: canvasX,
        y: canvasY,
        radius: 12,
        maxRadius: 280 + currentCombo * 40,
        alpha: 1.0,
        color: isPlasma ? "#e879f9" : currentCombo >= 3 ? "#38bdf8" : "#fb923c",
      });

      on67Achieved(xPercent, yPercent, canvasX, canvasY);
    },
    [on67Achieved]
  );

  useEffect(() => {
    if (cameraStatus !== "granted" || modelLoading || !handLandmarkerRef.current) {
      return;
    }

    let lastVideoTime = -1;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && handLandmarkerRef.current) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          const currentTime = video.currentTime;
          if (currentTime !== lastVideoTime) {
            lastVideoTime = currentTime;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const startTimeMs = performance.now();
            const activeCombo = comboRef.current;
            const isFireActive = activeCombo >= 2 || startTimeMs < burstUntilRef.current;
            const isLaserActive = activeCombo >= 3;
            const isLightningActive = activeCombo >= 2;

            // Draw border vignette pulse when combo is heating up
            if (activeCombo >= 2) {
              ctx.save();
              const pulse = (Math.sin(startTimeMs * 0.008) + 1) * 0.5;
              const vignetteGrad = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width * 0.35,
                canvas.width / 2,
                canvas.height / 2,
                canvas.width * 0.72
              );
              const vignetteColor =
                activeCombo >= 5
                  ? `rgba(168, 85, 247, ${0.18 + pulse * 0.12})`
                  : `rgba(249, 115, 22, ${0.16 + pulse * 0.14})`;
              vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
              vignetteGrad.addColorStop(1, vignetteColor);
              ctx.fillStyle = vignetteGrad;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.restore();
            }

            try {
              const detections = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

              // Detect eyes for eye lasers
              if (faceDetectorRef.current && (activeCombo >= 2 || isLaserActive)) {
                try {
                  const faceDetections = faceDetectorRef.current.detectForVideo(video, startTimeMs);
                  if (
                    faceDetections?.detections &&
                    faceDetections.detections.length > 0
                  ) {
                    const keypoints = faceDetections.detections[0].keypoints;
                    if (keypoints && keypoints.length >= 2) {
                      const rawEye0 = {
                        x: (1 - keypoints[0].x) * canvas.width,
                        y: keypoints[0].y * canvas.height,
                      };
                      const rawEye1 = {
                        x: (1 - keypoints[1].x) * canvas.width,
                        y: keypoints[1].y * canvas.height,
                      };
                      lastEyesRef.current = {
                        left: rawEye0.x < rawEye1.x ? rawEye0 : rawEye1,
                        right: rawEye0.x < rawEye1.x ? rawEye1 : rawEye0,
                        time: startTimeMs,
                      };
                    }
                  }
                } catch {
                  // Ignore frame detection error
                }
              }

              const handScreenPositions: { x: number; y: number }[] = [];

              if (detections?.landmarks && detections.landmarks.length > 0) {
                const hands = detections.landmarks;

                const { scaleState: updatedScale, result } = trackerRef.current.process(
                  hands,
                  canvas.width,
                  canvas.height
                );

                if (result?.detected) {
                  const mirroredCanvasX = canvas.width - (result.handX || canvas.width / 2);
                  const rawCanvasY = result.handY || canvas.height / 2;
                  const xPercent = (mirroredCanvasX / canvas.width) * 100;
                  const yPercent = (rawCanvasY / canvas.height) * 100;
                  handleScore(xPercent, yPercent, mirroredCanvasX, rawCanvasY);
                }

                // Collect hand centers
                hands.forEach((landmarks: { x: number; y: number }[], handIdx: number) => {
                  const center = updatedScale.handCenters[handIdx];
                  if (center) {
                    handScreenPositions.push({
                      x: (1 - center.x) * canvas.width,
                      y: center.y * canvas.height,
                    });
                  }
                });

                // DRAW ELECTRIC LIGHTNING ARCS BETWEEN HANDS (When combo >= 2)
                if (isLightningActive && handScreenPositions.length >= 2) {
                  ctx.save();
                  ctx.globalCompositeOperation = "lighter";

                  const h1 = handScreenPositions[0];
                  const h2 = handScreenPositions[1];
                  const lightningPoints = createLightningPath(h1.x, h1.y, h2.x, h2.y, 60, 4);

                  // Broad electric glow
                  ctx.beginPath();
                  ctx.moveTo(lightningPoints[0].x, lightningPoints[0].y);
                  for (let i = 1; i < lightningPoints.length; i++) {
                    ctx.lineTo(lightningPoints[i].x, lightningPoints[i].y);
                  }
                  ctx.strokeStyle = activeCombo >= 5 ? "#e879f9" : "#38bdf8";
                  ctx.lineWidth = 10;
                  ctx.shadowColor = activeCombo >= 5 ? "#c084fc" : "#22d3ee";
                  ctx.shadowBlur = 24;
                  ctx.lineCap = "round";
                  ctx.stroke();

                  // Mid arc
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = "#ffffff";
                  ctx.stroke();

                  // Lightning sparks / branch discharges
                  for (let b = 0; b < 2; b++) {
                    const rndIdx = Math.floor(Math.random() * (lightningPoints.length - 2)) + 1;
                    const bp = lightningPoints[rndIdx];
                    const branchEnd = {
                      x: bp.x + (Math.random() - 0.5) * 110,
                      y: bp.y + (Math.random() - 0.5) * 90,
                    };
                    const branchPoints = createLightningPath(bp.x, bp.y, branchEnd.x, branchEnd.y, 35, 3);
                    ctx.beginPath();
                    ctx.moveTo(branchPoints[0].x, branchPoints[0].y);
                    for (let j = 1; j < branchPoints.length; j++) {
                      ctx.lineTo(branchPoints[j].x, branchPoints[j].y);
                    }
                    ctx.strokeStyle = activeCombo >= 5 ? "#f0abfc" : "#7dd3fc";
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                  }

                  ctx.restore();
                }

                // Draw hands, bone lines & orbs
                hands.forEach((landmarks: { x: number; y: number }[], handIdx: number) => {
                  const center = updatedScale.handCenters[handIdx];
                  const isScreenLeft =
                    hands.length >= 2
                      ? handIdx === updatedScale.rightHandIndex
                      : (center?.x ?? 0.5) >= 0.5;

                  const accentColor = isFireActive
                    ? activeCombo >= 5
                      ? "#e879f9"
                      : "#fb923c"
                    : isScreenLeft
                    ? "#22d3ee"
                    : "#c084fc";

                  ctx.save();
                  ctx.lineWidth = isFireActive ? 3.5 : 2;
                  ctx.strokeStyle = isFireActive
                    ? activeCombo >= 5
                      ? "rgba(232, 121, 249, 0.85)"
                      : "rgba(251, 146, 60, 0.85)"
                    : isScreenLeft
                    ? "rgba(34, 211, 238, 0.55)"
                    : "rgba(192, 132, 252, 0.55)";
                  ctx.lineCap = "round";

                  HAND_CONNECTIONS.forEach(([i, j]) => {
                    const p1 = landmarks[i];
                    const p2 = landmarks[j];
                    if (p1 && p2) {
                      ctx.beginPath();
                      ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
                      ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
                      ctx.stroke();
                    }
                  });

                  landmarks.forEach((p, idx) => {
                    const x = (1 - p.x) * canvas.width;
                    const y = p.y * canvas.height;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fillStyle = isFireActive ? "#fef08a" : "rgba(255, 255, 255, 0.85)";
                    ctx.fill();

                    // Emit flame particles from fingertips
                    if (
                      isFireActive &&
                      (idx === 0 || idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20) &&
                      Math.random() < 0.75
                    ) {
                      const isPlasma = activeCombo >= 5;
                      fireParticlesRef.current.push({
                        x: x + (Math.random() - 0.5) * 18,
                        y: y + (Math.random() - 0.5) * 12,
                        vx: (Math.random() - 0.5) * 2.6,
                        vy: -(3.5 + Math.random() * 5.8),
                        size: 14 + Math.random() * 20 + Math.min(activeCombo * 2.5, 18),
                        life: 0,
                        maxLife: 16 + Math.random() * 14,
                        hue: isPlasma ? 280 + Math.random() * 50 : 10 + Math.random() * 42,
                      });
                    }
                  });

                  if (center) {
                    const cx = (1 - center.x) * canvas.width;
                    const cy = center.y * canvas.height;

                    const orbRadius = Math.max(
                      26,
                      Math.min(60, center.radius * canvas.height * (isFireActive ? 1.05 : 0.8))
                    );

                    // Core palm flames
                    if (isFireActive) {
                      const flamesPerFrame = Math.min(7, 2 + Math.floor(activeCombo / 2));
                      const isPlasma = activeCombo >= 5;
                      for (let f = 0; f < flamesPerFrame; f++) {
                        fireParticlesRef.current.push({
                          x: cx + (Math.random() - 0.5) * orbRadius * 1.2,
                          y: cy + (Math.random() - 0.5) * orbRadius * 0.7,
                          vx: (Math.random() - 0.5) * 3.2,
                          vy: -(4.5 + Math.random() * 6.5),
                          size: 20 + Math.random() * 26,
                          life: 0,
                          maxLife: 18 + Math.random() * 14,
                          hue: isPlasma ? 275 + Math.random() * 55 : 8 + Math.random() * 45,
                        });
                      }
                    }

                    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, orbRadius);
                    if (isFireActive) {
                      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
                      grad.addColorStop(
                        0.4,
                        activeCombo >= 5 ? "rgba(232, 121, 249, 0.8)" : "rgba(251, 146, 60, 0.85)"
                      );
                      grad.addColorStop(
                        0.8,
                        activeCombo >= 5 ? "rgba(147, 51, 234, 0.4)" : "rgba(239, 68, 68, 0.4)"
                      );
                      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    } else if (isScreenLeft) {
                      grad.addColorStop(0, "rgba(34, 211, 238, 0.65)");
                      grad.addColorStop(0.6, "rgba(34, 211, 238, 0.22)");
                      grad.addColorStop(1, "rgba(34, 211, 238, 0)");
                    } else {
                      grad.addColorStop(0, "rgba(192, 132, 252, 0.65)");
                      grad.addColorStop(0.6, "rgba(192, 132, 252, 0.22)");
                      grad.addColorStop(1, "rgba(192, 132, 252, 0)");
                    }

                    ctx.beginPath();
                    ctx.arc(cx, cy, orbRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = grad;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(cx, cy, orbRadius * 0.68, 0, 2 * Math.PI);
                    ctx.strokeStyle = accentColor;
                    ctx.lineWidth = isFireActive ? 3.5 : 2;
                    ctx.stroke();

                    // Arcade 3D font text for "6" and "7"
                    ctx.font = "900 24px system-ui, sans-serif";
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.shadowColor = accentColor;
                    ctx.shadowBlur = 12;
                    ctx.fillText(isScreenLeft ? "6" : "7", cx, cy);
                  }

                  ctx.restore();
                });
              }

              // Update & Render Shockwaves
              if (shockwavesRef.current.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";

                const survivingShockwaves: Shockwave[] = [];
                for (const sw of shockwavesRef.current) {
                  sw.radius += 18;
                  sw.alpha *= 0.91;

                  if (sw.radius < sw.maxRadius && sw.alpha > 0.04) {
                    ctx.beginPath();
                    ctx.arc(sw.x, sw.y, sw.radius, 0, 2 * Math.PI);
                    ctx.strokeStyle = sw.color;
                    ctx.lineWidth = Math.max(1.5, 8 * sw.alpha);
                    ctx.shadowColor = sw.color;
                    ctx.shadowBlur = 20;
                    ctx.stroke();

                    survivingShockwaves.push(sw);
                  }
                }
                shockwavesRef.current = survivingShockwaves;
                ctx.restore();
              }

              // Update & Render Fire Particles
              if (fireParticlesRef.current.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";

                const surviving: FireParticle[] = [];
                for (const p of fireParticlesRef.current) {
                  p.life += 1;
                  if (p.life >= p.maxLife) continue;

                  p.x += p.vx + Math.sin(p.life * 0.5) * 1.1;
                  p.y += p.vy;
                  p.size *= 0.96;

                  const progress = p.life / p.maxLife;
                  const alpha = Math.max(0, (1 - progress) * 0.9);
                  const currentRadius = Math.max(2, p.size * (1 - progress * 0.4));

                  const fireGrad = ctx.createRadialGradient(
                    p.x,
                    p.y,
                    1,
                    p.x,
                    p.y,
                    currentRadius
                  );
                  fireGrad.addColorStop(0, `hsla(${p.hue + 25}, 100%, 88%, ${alpha})`);
                  fireGrad.addColorStop(0.45, `hsla(${p.hue}, 100%, 58%, ${alpha * 0.85})`);
                  fireGrad.addColorStop(1, `hsla(${p.hue - 10}, 100%, 40%, 0)`);

                  ctx.beginPath();
                  ctx.arc(p.x, p.y, currentRadius, 0, 2 * Math.PI);
                  ctx.fillStyle = fireGrad;
                  ctx.fill();

                  surviving.push(p);
                }

                fireParticlesRef.current = surviving.slice(-300);
                ctx.restore();
              }

              // Render Eye Lasers (combo >= 3)
              if (isLaserActive) {
                let leftEye = lastEyesRef.current?.left;
                let rightEye = lastEyesRef.current?.right;

                if (
                  !leftEye ||
                  !rightEye ||
                  startTimeMs - (lastEyesRef.current?.time ?? 0) > 1500
                ) {
                  const midX =
                    handScreenPositions.length > 0
                      ? handScreenPositions.reduce((acc, h) => acc + h.x, 0) /
                        handScreenPositions.length
                      : canvas.width * 0.5;
                  const eyeY = canvas.height * 0.28;
                  leftEye = { x: midX - canvas.width * 0.045, y: eyeY };
                  rightEye = { x: midX + canvas.width * 0.045, y: eyeY };
                }

                const sortedHands = [...handScreenPositions].sort((a, b) => a.x - b.x);
                const leftTarget = sortedHands[0] || {
                  x: canvas.width * 0.2,
                  y: canvas.height * 0.85,
                };
                const rightTarget =
                  sortedHands[1] ||
                  sortedHands[0] || {
                    x: canvas.width * 0.8,
                    y: canvas.height * 0.85,
                  };

                const laserColor = activeCombo >= 5 ? "#22d3ee" : "#ff1e56";
                const laserOuterGlow =
                  activeCombo >= 5 ? "rgba(34, 211, 238, 0.9)" : "rgba(255, 30, 86, 0.9)";

                const drawEyeLaser = (
                  eye: { x: number; y: number },
                  target: { x: number; y: number }
                ) => {
                  ctx.save();
                  ctx.globalCompositeOperation = "lighter";

                  const dx = target.x - eye.x;
                  const dy = target.y - eye.y;
                  const endX = eye.x + dx * 1.15;
                  const endY = eye.y + dy * 1.15;

                  ctx.beginPath();
                  ctx.moveTo(eye.x, eye.y);
                  ctx.lineTo(endX, endY);
                  ctx.strokeStyle = laserOuterGlow;
                  ctx.lineWidth = 16 + Math.sin(startTimeMs * 0.03) * 4;
                  ctx.lineCap = "round";
                  ctx.shadowColor = laserColor;
                  ctx.shadowBlur = 32;
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(eye.x, eye.y);
                  ctx.lineTo(endX, endY);
                  ctx.strokeStyle = laserColor;
                  ctx.lineWidth = 8;
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(eye.x, eye.y);
                  ctx.lineTo(endX, endY);
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = 3.5;
                  ctx.stroke();

                  const eyeRadius = 30 + Math.sin(startTimeMs * 0.04) * 6;
                  const eyeGrad = ctx.createRadialGradient(
                    eye.x,
                    eye.y,
                    2,
                    eye.x,
                    eye.y,
                    eyeRadius
                  );
                  eyeGrad.addColorStop(0, "#ffffff");
                  eyeGrad.addColorStop(0.35, laserColor);
                  eyeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

                  ctx.beginPath();
                  ctx.arc(eye.x, eye.y, eyeRadius, 0, 2 * Math.PI);
                  ctx.fillStyle = eyeGrad;
                  ctx.fill();

                  ctx.beginPath();
                  ctx.moveTo(eye.x - eyeRadius * 1.5, eye.y);
                  ctx.lineTo(eye.x + eyeRadius * 1.5, eye.y);
                  ctx.moveTo(eye.x, eye.y - eyeRadius * 0.95);
                  ctx.lineTo(eye.x, eye.y + eyeRadius * 0.95);
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = 3;
                  ctx.stroke();

                  ctx.restore();
                };

                drawEyeLaser(leftEye, leftTarget);
                drawEyeLaser(rightEye, rightTarget);
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
  }, [cameraStatus, modelLoading, handleScore, handLandmarkerRef, faceDetectorRef, videoRef]);

  const isCameraActive = cameraStatus === "granted" || cameraStatus === "requesting";

  return (
    <main className="relative flex-1 w-screen overflow-hidden bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-all duration-700 ease-out ${
          isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${isBlurred ? "filter blur-xl scale-105 brightness-50" : "filter blur-0 scale-100 brightness-100"}`}
      />

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 transition-all duration-700 ease-out ${
          isCameraActive ? "opacity-100" : "opacity-0"
        } ${isBlurred ? "filter blur-lg opacity-40" : "filter blur-0 opacity-100"}`}
      />

      {!isCameraActive && (
        <div className="z-20 p-6 text-center flex flex-col items-center gap-4">
          <CameraOff className="w-12 h-12 text-zinc-500 animate-pulse" />
          <p className="text-sm text-zinc-300 max-w-xs leading-relaxed">
            {cameraStatus === "denied"
              ? "Acceso a la cámara bloqueado o denegado. Revisa los permisos del navegador para jugar."
              : "La cámara está desactivada."}
          </p>
          <button
            onClick={onStartCamera}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(34,211,238,0.5)] transition cursor-pointer"
          >
            <Camera className="w-4 h-4" /> Activar Cámara
          </button>
        </div>
      )}

      {isCameraActive && modelLoading && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Cargando Visión de Aura...
            </span>
          </div>
        </div>
      )}

      {isCameraActive && modelError && (
        <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center gap-3 z-20 text-center">
          <span className="text-xs text-rose-300 max-w-md">{modelError}</span>
          <button
            onClick={onRetryModel}
            className="px-5 py-2.5 bg-white text-black text-xs font-bold uppercase rounded-xl hover:bg-zinc-200 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Spectacular 3D Arcade Floating Popups */}
      {floatingPoints.map((p) => (
        <div
          key={p.id}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          className="absolute z-20 pointer-events-none text-4xl sm:text-6xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 drop-shadow-[0_0_24px_rgba(251,146,60,1)] [text-shadow:_0_3px_0_#450a0a,_0_5px_0_#450a0a] animate-bounce"
        >
          {p.text}
        </div>
      ))}
    </main>
  );
}
