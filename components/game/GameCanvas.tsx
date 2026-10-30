"use client";

import React, { useEffect, useRef, useCallback, RefObject } from "react";
import { Camera, CameraOff } from "lucide-react";
import { CameraStatus } from "@/hooks/useCamera";
import { Gesture67Tracker, HAND_CONNECTIONS } from "@/lib/gestureDetector";
import { PlayerEquipped } from "@/lib/leaderboard/types";
import { DEFAULT_EQUIPPED } from "@/lib/shop/catalog";
import { sounds } from "@/lib/audio";

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

interface MatrixDrop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
}

interface GameCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  modelLoading: boolean;
  modelError: string | null;
  combo: number;
  isBlurred?: boolean;
  equipped?: PlayerEquipped;
  isOverdriveActive?: boolean;
  isOverdriveReady?: boolean;
  onOverdriveTriggered?: () => void;
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

// --- SCREEN BORDER ENERGY SHOCKWAVES & RIPPLES ---
function drawScreenBorderWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Inward propagating rectangular shockwave ripples
  for (let i = 0; i < 3; i++) {
    const phase = ((timeMs * 0.0018 + i * 0.33) % 1);
    const alpha = (1 - phase) * 0.75;
    const insetX = phase * (width * 0.18);
    const insetY = phase * (height * 0.18);

    ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
    ctx.lineWidth = 3.5 * (1 - phase * 0.5);

    ctx.strokeRect(insetX, insetY, width - insetX * 2, height - insetY * 2);
  }

  // Blazing neon border edge glow
  const borderThickness = 18;
  const topGrad = ctx.createLinearGradient(0, 0, 0, borderThickness);
  topGrad.addColorStop(0, "rgba(251, 146, 60, 0.85)");
  topGrad.addColorStop(1, "rgba(251, 146, 60, 0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, borderThickness);

  const btmGrad = ctx.createLinearGradient(0, height, 0, height - borderThickness);
  btmGrad.addColorStop(0, "rgba(251, 146, 60, 0.85)");
  btmGrad.addColorStop(1, "rgba(251, 146, 60, 0)");
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, height - borderThickness, width, borderThickness);

  const leftGrad = ctx.createLinearGradient(0, 0, borderThickness, 0);
  leftGrad.addColorStop(0, "rgba(234, 88, 12, 0.85)");
  leftGrad.addColorStop(1, "rgba(234, 88, 12, 0)");
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, borderThickness, height);

  const rightGrad = ctx.createLinearGradient(width, 0, width - borderThickness, 0);
  rightGrad.addColorStop(0, "rgba(234, 88, 12, 0.85)");
  rightGrad.addColorStop(1, "rgba(234, 88, 12, 0)");
  ctx.fillStyle = rightGrad;
  ctx.fillRect(width - borderThickness, 0, borderThickness, height);

  ctx.restore();
}

// Hyperspace speed lines for aura_hyper_speed or overdrive
function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cx = width / 2;
  const cy = height / 2;
  const lineCount = 28;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + Math.sin(timeMs * 0.001 + i) * 0.05;
    const speedPhase = ((timeMs * 0.003 + i * 0.17) % 1);
    const startDist = Math.max(width, height) * (0.35 + speedPhase * 0.5);
    const endDist = startDist + 80;

    const x1 = cx + Math.cos(angle) * startDist;
    const y1 = cy + Math.sin(angle) * startDist;
    const x2 = cx + Math.cos(angle) * endDist;
    const y2 = cy + Math.sin(angle) * endDist;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.random() * 0.5})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;
    ctx.stroke();
  }
  ctx.restore();
}

// Phoenix Wings behind shoulders
function drawPhoenixWings(
  ctx: CanvasRenderingContext2D,
  midX: number,
  midY: number,
  eyeDist: number,
  timeMs: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const wingSpan = eyeDist * 3.8;
  const flap = Math.sin(timeMs * 0.006) * 18;

  const drawSingleWing = (isLeft: boolean) => {
    ctx.save();
    const sign = isLeft ? -1 : 1;
    const rootX = midX + sign * (eyeDist * 0.7);
    const rootY = midY + eyeDist * 1.1;

    const wingTipX = rootX + sign * (wingSpan * 0.85);
    const wingTipY = rootY - eyeDist * 1.4 + flap;

    const grad = ctx.createLinearGradient(rootX, rootY, wingTipX, wingTipY);
    grad.addColorStop(0, "rgba(251, 191, 36, 0.15)");
    grad.addColorStop(0.4, "rgba(245, 158, 11, 0.75)");
    grad.addColorStop(0.85, "rgba(239, 68, 68, 0.9)");
    grad.addColorStop(1, "rgba(254, 240, 138, 0.95)");

    // Primary wing sweep
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.bezierCurveTo(
      rootX + sign * (wingSpan * 0.3),
      rootY - eyeDist * 2.1,
      wingTipX - sign * 40,
      wingTipY - 60,
      wingTipX,
      wingTipY
    );
    // Lower feathers
    ctx.bezierCurveTo(
      wingTipX - sign * (wingSpan * 0.35),
      wingTipY + eyeDist * 0.9,
      rootX + sign * (wingSpan * 0.15),
      rootY + eyeDist * 0.6,
      rootX,
      rootY
    );
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 35;
    ctx.fill();

    // Feather rib accents
    for (let f = 1; f <= 4; f++) {
      ctx.beginPath();
      ctx.moveTo(rootX + sign * (f * 15), rootY);
      ctx.lineTo(
        rootX + sign * (wingSpan * (0.35 + f * 0.12)),
        rootY - eyeDist * (0.4 + f * 0.22) + flap * 0.6
      );
      ctx.strokeStyle = "rgba(254, 240, 138, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();
  };

  drawSingleWing(true);
  drawSingleWing(false);

  ctx.restore();
}

// --- 3D REALISTIC HEADWEAR DRAWING HELPERS ---

function drawPixelShades(
  ctx: CanvasRenderingContext2D,
  midX: number,
  midY: number,
  dist: number,
  angle: number
) {
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const scale = dist / 50;
  const w = 55 * scale;
  const h = 18 * scale;
  const px = 3.5 * scale;

  ctx.fillStyle = "#09090b";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2 * scale;

  ctx.beginPath();
  ctx.rect(-w, -h * 0.45, w * 2, h);
  ctx.fill();
  ctx.stroke();

  ctx.fillRect(-w + px * 2, h * 0.55, px * 4, px * 2);
  ctx.fillRect(w - px * 6, h * 0.55, px * 4, px * 2);

  // Left lens reflection
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-w + px * 3, -h * 0.25, px * 2.5, px * 2.5);
  ctx.fillRect(-w + px * 5.5, 0, px * 2.5, px * 2.5);
  ctx.fillRect(-w + px * 8, h * 0.25, px * 2.5, px * 2.5);

  // Right lens specular glare
  ctx.fillRect(w - px * 9, -h * 0.25, px * 2.5, px * 2.5);

  ctx.restore();
}

function drawCyberVisor(
  ctx: CanvasRenderingContext2D,
  midX: number,
  midY: number,
  dist: number,
  angle: number,
  timeMs: number
) {
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const w = dist * 1.35;
  const h = dist * 0.48;

  // 3D Glass curvature gradient with specular rim
  const grad = ctx.createLinearGradient(-w, -h * 0.5, w, h * 0.5);
  grad.addColorStop(0, "rgba(6, 182, 212, 0.35)");
  grad.addColorStop(0.3, "rgba(34, 211, 238, 0.75)");
  grad.addColorStop(0.7, "rgba(14, 165, 233, 0.5)");
  grad.addColorStop(1, "rgba(6, 182, 212, 0.35)");

  // Front curved lens
  ctx.beginPath();
  ctx.moveTo(-w, -h * 0.5);
  ctx.lineTo(w, -h * 0.5);
  ctx.lineTo(w * 0.92, h * 0.5);
  ctx.lineTo(-w * 0.92, h * 0.5);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 3D Bevel border
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "#06b6d4";
  ctx.shadowBlur = 18;
  ctx.stroke();

  // Top white specular glare line
  ctx.beginPath();
  ctx.moveTo(-w * 0.85, -h * 0.42);
  ctx.lineTo(w * 0.85, -h * 0.42);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Dynamic sweeping telemetry line
  const scanY = ((timeMs * 0.08) % h) - h * 0.5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.82, scanY);
  ctx.lineTo(w * 0.82, scanY);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Targeting reticle over center
  ctx.beginPath();
  ctx.arc(0, 0, dist * 0.14, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(165, 243, 252, 0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawFireHorns(
  ctx: CanvasRenderingContext2D,
  midX: number,
  midY: number,
  dist: number,
  angle: number,
  timeMs: number
) {
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const hornSpread = dist * 0.65;
  const hornHeight = dist * 1.15;
  const flicker = Math.sin(timeMs * 0.02) * (dist * 0.08);

  const drawSingleHorn = (isLeft: boolean) => {
    ctx.save();
    const sign = isLeft ? -1 : 1;
    const baseX = sign * hornSpread;
    const baseY = -dist * 0.55;
    const tipX = baseX + sign * (dist * 0.28);
    const tipY = baseY - hornHeight + flicker;

    // 3D Volumetric horn shading: Left side light highlight, right side dark obsidian shadow
    const hornGrad = ctx.createLinearGradient(baseX - dist * 0.16, baseY, baseX + dist * 0.16, baseY);
    hornGrad.addColorStop(0, "#f97316");
    hornGrad.addColorStop(0.3, "#dc2626");
    hornGrad.addColorStop(0.7, "#7f1d1d");
    hornGrad.addColorStop(1, "#1c1917");

    ctx.beginPath();
    ctx.moveTo(baseX - dist * 0.18, baseY);
    ctx.quadraticCurveTo(
      baseX + sign * (dist * 0.05),
      baseY - hornHeight * 0.55,
      tipX,
      tipY
    );
    ctx.quadraticCurveTo(
      baseX + sign * (dist * 0.32),
      baseY - hornHeight * 0.45,
      baseX + dist * 0.18,
      baseY
    );
    ctx.closePath();

    ctx.fillStyle = hornGrad;
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 24;
    ctx.fill();

    // 3D Specular ridge curve
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(
      baseX + sign * (dist * 0.12),
      baseY - hornHeight * 0.5,
      tipX,
      tipY
    );
    ctx.strokeStyle = "rgba(254, 240, 138, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  };

  drawSingleHorn(true);
  drawSingleHorn(false);

  ctx.restore();
}

function drawGoldenCrown(
  ctx: CanvasRenderingContext2D,
  midX: number,
  midY: number,
  dist: number,
  angle: number,
  timeMs: number
) {
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const bobbing = Math.sin(timeMs * 0.005) * (dist * 0.08);
  const crownY = -dist * 1.35 + bobbing;
  const w = dist * 1.3;
  const h = dist * 0.8;

  ctx.save();
  ctx.translate(0, crownY);

  // 1. Back rim in 3D perspective (creates depth inside crown)
  ctx.beginPath();
  ctx.ellipse(0, h * 0.22, w * 0.48, h * 0.14, 0, Math.PI, 0);
  ctx.fillStyle = "#713f12";
  ctx.fill();

  // 2. Front 3D faceted gold crown body
  const goldGrad = ctx.createLinearGradient(-w * 0.5, -h, w * 0.5, h * 0.3);
  goldGrad.addColorStop(0, "#fef08a");
  goldGrad.addColorStop(0.25, "#eab308");
  goldGrad.addColorStop(0.65, "#ca8a04");
  goldGrad.addColorStop(1, "#854d0e");

  ctx.beginPath();
  ctx.moveTo(-w * 0.5, h * 0.22);
  ctx.lineTo(-w * 0.55, -h * 0.55);
  ctx.lineTo(-w * 0.22, -h * 0.1);
  ctx.lineTo(0, -h * 0.88);
  ctx.lineTo(w * 0.22, -h * 0.1);
  ctx.lineTo(w * 0.55, -h * 0.55);
  ctx.lineTo(w * 0.5, h * 0.22);
  ctx.closePath();

  ctx.fillStyle = goldGrad;
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 28;
  ctx.fill();

  // 3D Bevel stroke
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Front bottom rim arc
  ctx.beginPath();
  ctx.ellipse(0, h * 0.22, w * 0.48, h * 0.14, 0, 0, Math.PI);
  ctx.fillStyle = "#eab308";
  ctx.fill();
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Spires golden spheres with shine highlight
  const drawOrb = (ox: number, oy: number) => {
    const orbGrad = ctx.createRadialGradient(ox - 3, oy - 3, 1, ox, oy, dist * 0.09);
    orbGrad.addColorStop(0, "#ffffff");
    orbGrad.addColorStop(0.4, "#fef08a");
    orbGrad.addColorStop(1, "#ca8a04");

    ctx.beginPath();
    ctx.arc(ox, oy, dist * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = orbGrad;
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 12;
    ctx.fill();
  };
  drawOrb(-w * 0.55, -h * 0.55);
  drawOrb(0, -h * 0.88);
  drawOrb(w * 0.55, -h * 0.55);

  // 3D Gemstones: Center Ruby & Side Emeralds
  const drawGem = (gx: number, gy: number, color1: string, color2: string) => {
    const gemGrad = ctx.createRadialGradient(gx - 2, gy - 2, 1, gx, gy, dist * 0.075);
    gemGrad.addColorStop(0, "#ffffff");
    gemGrad.addColorStop(0.4, color1);
    gemGrad.addColorStop(1, color2);

    ctx.beginPath();
    ctx.arc(gx, gy, dist * 0.075, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  drawGem(0, h * 0.08, "#ef4444", "#991b1b"); // Center Ruby
  drawGem(-w * 0.25, h * 0.11, "#10b981", "#064e3b"); // Emerald left
  drawGem(w * 0.25, h * 0.11, "#10b981", "#064e3b"); // Emerald right

  ctx.restore();
  ctx.restore();
}

function drawAngelHalo(
  ctx: CanvasRenderingContext2D,
  midX: number,
  midY: number,
  dist: number,
  angle: number,
  timeMs: number
) {
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const bobbing = Math.sin(timeMs * 0.005) * (dist * 0.08);
  const haloY = -dist * 1.25 + bobbing;
  const radiusX = dist * 0.75;
  const radiusY = dist * 0.24;

  ctx.save();
  ctx.translate(0, haloY);

  // Divine heavenly light rays falling onto head
  const rayGrad = ctx.createLinearGradient(0, 0, 0, dist * 0.8);
  rayGrad.addColorStop(0, "rgba(254, 240, 138, 0.45)");
  rayGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
  ctx.beginPath();
  ctx.moveTo(-radiusX * 0.8, 0);
  ctx.lineTo(radiusX * 0.8, 0);
  ctx.lineTo(radiusX * 0.4, dist * 0.8);
  ctx.lineTo(-radiusX * 0.4, dist * 0.8);
  ctx.closePath();
  ctx.fillStyle = rayGrad;
  ctx.fill();

  // 3D Elliptical Torus Halo
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 8;
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 30;
  ctx.stroke();

  // Inner core bright light
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Orbiting sparkle star
  const sparkleAngle = timeMs * 0.004;
  const sx = Math.cos(sparkleAngle) * radiusX;
  const sy = Math.sin(sparkleAngle) * radiusY;
  ctx.beginPath();
  ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 15;
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawSamuraiOniMask(
  ctx: CanvasRenderingContext2D,
  midX: number,
  midY: number,
  dist: number,
  angle: number,
  timeMs: number
) {
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  // Lower face positioning (chin/jaw area)
  const maskY = dist * 0.72;
  const w = dist * 1.1;
  const h = dist * 0.75;

  ctx.save();
  ctx.translate(0, maskY);

  // 1. Armored jaw plate (Crimson lacquer 3D shading)
  const plateGrad = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
  plateGrad.addColorStop(0, "#450a0a");
  plateGrad.addColorStop(0.3, "#dc2626");
  plateGrad.addColorStop(0.7, "#991b1b");
  plateGrad.addColorStop(1, "#450a0a");

  ctx.beginPath();
  ctx.moveTo(-w * 0.55, -h * 0.4);
  ctx.quadraticCurveTo(-w * 0.45, h * 0.5, 0, h * 0.7);
  ctx.quadraticCurveTo(w * 0.45, h * 0.5, w * 0.55, -h * 0.4);
  ctx.quadraticCurveTo(0, -h * 0.2, -w * 0.55, -h * 0.4);
  ctx.closePath();

  ctx.fillStyle = plateGrad;
  ctx.shadowColor = "#dc2626";
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 2. Nose bridge guard (Obsidian Titanium)
  ctx.beginPath();
  ctx.moveTo(-dist * 0.16, -h * 0.4);
  ctx.lineTo(0, -h * 0.75);
  ctx.lineTo(dist * 0.16, -h * 0.4);
  ctx.closePath();
  ctx.fillStyle = "#18181b";
  ctx.fill();
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Menacing Golden 3D Fangs
  const drawFang = (fx: number, fy: number, isRight: boolean) => {
    ctx.save();
    const fangGrad = ctx.createLinearGradient(fx, fy, fx, fy + dist * 0.35);
    fangGrad.addColorStop(0, "#ffffff");
    fangGrad.addColorStop(0.3, "#fef08a");
    fangGrad.addColorStop(1, "#ca8a04");

    ctx.beginPath();
    ctx.moveTo(fx - dist * 0.08, fy);
    ctx.lineTo(fx + (isRight ? dist * 0.04 : -dist * 0.04), fy + dist * 0.35);
    ctx.lineTo(fx + dist * 0.08, fy);
    ctx.closePath();

    ctx.fillStyle = fangGrad;
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  };

  drawFang(-dist * 0.28, h * 0.05, false); // Upper Left Fang
  drawFang(dist * 0.28, h * 0.05, true);   // Upper Right Fang
  drawFang(-dist * 0.16, h * 0.28, false); // Lower Left Fang
  drawFang(dist * 0.16, h * 0.28, true);   // Lower Right Fang

  // Breath smoke puffs (Cyber spirit)
  const puff = Math.sin(timeMs * 0.01) * 6;
  ctx.beginPath();
  ctx.arc(-dist * 0.15, h * 0.4 + puff, 8, 0, Math.PI * 2);
  ctx.arc(dist * 0.15, h * 0.4 + puff, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(34, 211, 238, 0.25)";
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

export default function GameCanvas({
  videoRef,
  cameraStatus,
  modelLoading,
  modelError,
  combo,
  isBlurred = false,
  equipped,
  isOverdriveActive = false,
  isOverdriveReady = false,
  onOverdriveTriggered,
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
  const matrixDropsRef = useRef<MatrixDrop[]>([]);
  const lastEyesRef = useRef<{
    left: { x: number; y: number };
    right: { x: number; y: number };
    time: number;
  } | null>(null);

  const faceFrameCounterRef = useRef<number>(0);

  const comboRef = useRef(combo);
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const burstUntilRef = useRef(burstUntil);
  useEffect(() => {
    burstUntilRef.current = burstUntil;
  }, [burstUntil]);

  const equippedRef = useRef<PlayerEquipped>(equipped || DEFAULT_EQUIPPED);
  useEffect(() => {
    equippedRef.current = equipped || DEFAULT_EQUIPPED;
  }, [equipped]);

  const isOverdriveRef = useRef(isOverdriveActive);
  useEffect(() => {
    isOverdriveRef.current = isOverdriveActive;
  }, [isOverdriveActive]);

  const isOverdriveReadyRef = useRef(isOverdriveReady);
  useEffect(() => {
    isOverdriveReadyRef.current = isOverdriveReady;
  }, [isOverdriveReady]);

  // Initialize matrix rain drops
  useEffect(() => {
    const drops: MatrixDrop[] = [];
    for (let i = 0; i < 40; i++) {
      drops.push({
        x: Math.random(),
        y: Math.random() * -500,
        speed: 4 + Math.random() * 8,
        chars: ["6", "7", "A", "U", "R", "A", "1", "0", "9"],
      });
    }
    matrixDropsRef.current = drops;
  }, []);

  const handleScore = useCallback(
    (xPercent: number, yPercent: number, canvasX: number, canvasY: number) => {
      const currentCombo = comboRef.current;
      const currentEquipped = equippedRef.current;
      const isPlasma = currentCombo >= 5;
      const isOverdrive = isOverdriveRef.current;
      const isBlueFlame = currentEquipped.gloves === "gloves_blue_flame";
      const isMidas = currentEquipped.gloves === "gloves_midas";
      const isCyber = currentEquipped.gloves === "gloves_cyber";
      const isDragon = currentEquipped.gloves === "gloves_dragon_claws";
      const isGalaxy = currentEquipped.gloves === "gloves_void_galaxy";

      // Spawn particles
      const count = Math.min(60, 20 + currentCombo * 6 + (isOverdrive ? 25 : 0));
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4.0 + Math.random() * 11.0;

        let particleHue = isPlasma ? 275 + Math.random() * 55 : 12 + Math.random() * 40;
        if (isBlueFlame) {
          particleHue = 195 + Math.random() * 35;
        } else if (isMidas || isOverdrive) {
          particleHue = 45 + Math.random() * 18;
        } else if (isCyber) {
          particleHue = 145 + Math.random() * 35;
        } else if (isDragon) {
          particleHue = 18 + Math.random() * 25;
        } else if (isGalaxy) {
          particleHue = 270 + Math.random() * 60;
        }

        fireParticlesRef.current.push({
          x: canvasX + (Math.random() - 0.5) * 40,
          y: canvasY + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.5,
          size: 18 + Math.random() * 32 + currentCombo * 2,
          life: 0,
          maxLife: 24 + Math.random() * 22,
          hue: particleHue,
        });
      }

      // Add shockwave ring
      let shockwaveColor = isPlasma ? "#e879f9" : currentCombo >= 3 ? "#38bdf8" : "#fb923c";
      if (isOverdrive) {
        shockwaveColor = "#facc15";
      } else if (currentEquipped.aura === "aura_rainbow") {
        shockwaveColor = `hsl(${Math.random() * 360}, 100%, 65%)`;
      } else if (currentEquipped.aura === "aura_thunderstorm") {
        shockwaveColor = "#38bdf8";
      } else if (isBlueFlame) {
        shockwaveColor = "#06b6d4";
      } else if (isMidas) {
        shockwaveColor = "#facc15";
      } else if (isGalaxy) {
        shockwaveColor = "#c084fc";
      }

      shockwavesRef.current.push({
        x: canvasX,
        y: canvasY,
        radius: 14,
        maxRadius: 300 + currentCombo * 45 + (isOverdrive ? 150 : 0),
        alpha: 1.0,
        color: shockwaveColor,
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
            const currentEquipped = equippedRef.current;
            const isOverdrive = isOverdriveRef.current;
            const equippedGloves = currentEquipped.gloves || "gloves_classic";
            const equippedHead = currentEquipped.head || "head_none";
            const equippedAura = currentEquipped.aura || "aura_classic";

            const isFireActive = activeCombo >= 2 || startTimeMs < burstUntilRef.current || isOverdrive;
            const isLaserActive = activeCombo >= 3 || isOverdrive;
            const isLightningActive = activeCombo >= 2 || equippedAura === "aura_thunderstorm" || isOverdrive;

            // 1. AURA VIGNETTE & SPECIAL TRAILS
            if (activeCombo >= 2 || equippedAura !== "aura_classic" || isOverdrive) {
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

              let vignetteColor = "rgba(0, 0, 0, 0)";
              if (isOverdrive) {
                vignetteColor = `rgba(250, 204, 21, ${0.28 + pulse * 0.16})`;
              } else if (equippedAura === "aura_rainbow") {
                const hue = (startTimeMs * 0.08) % 360;
                vignetteColor = `hsla(${hue}, 100%, 55%, ${0.2 + pulse * 0.12})`;
              } else if (equippedAura === "aura_thunderstorm") {
                vignetteColor = `rgba(56, 189, 248, ${0.18 + pulse * 0.14})`;
              } else if (activeCombo >= 5) {
                vignetteColor = `rgba(168, 85, 247, ${0.18 + pulse * 0.12})`;
              } else {
                vignetteColor = `rgba(249, 115, 22, ${0.16 + pulse * 0.14})`;
              }

              vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
              vignetteGrad.addColorStop(1, vignetteColor);
              ctx.fillStyle = vignetteGrad;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.restore();
            }

            // Screen Border Waves & Ripples (Active during Overdrive or High Combo)
            if (isOverdrive || activeCombo >= 4) {
              drawScreenBorderWaves(ctx, canvas.width, canvas.height, startTimeMs);
            }

            // Anime speed lines (for aura_hyper_speed or overdrive)
            if (equippedAura === "aura_hyper_speed" || isOverdrive) {
              drawSpeedLines(ctx, canvas.width, canvas.height, startTimeMs);
            }

            // Matrix Rain Effect (if aura_matrix equipped)
            if (equippedAura === "aura_matrix") {
              ctx.save();
              ctx.font = "bold 14px monospace";
              ctx.fillStyle = "#10b981";
              ctx.shadowColor = "#34d399";
              ctx.shadowBlur = 8;
              matrixDropsRef.current.forEach((drop) => {
                drop.y += drop.speed;
                if (drop.y > canvas.height) {
                  drop.y = -50;
                  drop.x = Math.random();
                }
                const dx = drop.x * canvas.width;
                const char = drop.chars[Math.floor(Math.random() * drop.chars.length)];
                ctx.fillText(char, dx, drop.y);
              });
              ctx.restore();
            }

            try {
              const detections = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

              // Detect eyes for headwear, eye lasers & phoenix wings (throttled to every 4th frame for high performance)
              faceFrameCounterRef.current += 1;
              const shouldRunFace = faceFrameCounterRef.current % 4 === 0;

              const needsFace =
                activeCombo >= 2 ||
                isLaserActive ||
                equippedHead !== "head_none" ||
                equippedAura === "aura_golden_phoenix";

              if (faceDetectorRef.current && needsFace && shouldRunFace) {
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

                // CHECK CLOSED FIST PUSH FOR AURA OVERDRIVE (Triggered when energy bar is full)
                if (isOverdriveReadyRef.current && !isOverdrive) {
                  const fistCheck = trackerRef.current.detectDoubleFistPush(hands);
                  if (fistCheck.detected) {
                    // Trigger Aura Overdrive / Blast!
                    sounds.playAuraOverdrive();
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate([80, 40, 120]);
                    }

                    const pushX = (1 - fistCheck.centerX) * canvas.width;
                    const pushY = fistCheck.centerY * canvas.height;

                    // Giant energy blast shockwaves
                    shockwavesRef.current.push({
                      x: pushX,
                      y: pushY,
                      radius: 35,
                      maxRadius: canvas.width * 1.3,
                      alpha: 1.0,
                      color: "#facc15",
                    });
                    shockwavesRef.current.push({
                      x: pushX,
                      y: pushY,
                      radius: 15,
                      maxRadius: canvas.width * 0.9,
                      alpha: 1.0,
                      color: "#ffffff",
                    });

                    if (onOverdriveTriggered) {
                      onOverdriveTriggered();
                    }
                  }
                }

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

                // DRAW ELECTRIC LIGHTNING ARCS BETWEEN HANDS
                if (isLightningActive && handScreenPositions.length >= 2) {
                  ctx.save();
                  ctx.globalCompositeOperation = "lighter";

                  const h1 = handScreenPositions[0];
                  const h2 = handScreenPositions[1];
                  const lightningPoints = createLightningPath(h1.x, h1.y, h2.x, h2.y, 60, 4);

                  ctx.beginPath();
                  ctx.moveTo(lightningPoints[0].x, lightningPoints[0].y);
                  for (let i = 1; i < lightningPoints.length; i++) {
                    ctx.lineTo(lightningPoints[i].x, lightningPoints[i].y);
                  }
                  ctx.strokeStyle = isOverdrive ? "#facc15" : activeCombo >= 5 ? "#e879f9" : "#38bdf8";
                  ctx.lineWidth = 10;
                  ctx.shadowColor = isOverdrive ? "#fbbf24" : activeCombo >= 5 ? "#c084fc" : "#22d3ee";
                  ctx.shadowBlur = 24;
                  ctx.lineCap = "round";
                  ctx.stroke();

                  ctx.lineWidth = 4;
                  ctx.strokeStyle = "#ffffff";
                  ctx.stroke();

                  ctx.restore();
                }

                // Render Phoenix Wings if equipped
                if (equippedAura === "aura_golden_phoenix" && lastEyesRef.current) {
                  const le = lastEyesRef.current.left;
                  const re = lastEyesRef.current.right;
                  const mx = (le.x + re.x) / 2;
                  const my = (le.y + re.y) / 2;
                  const dist = Math.hypot(re.x - le.x, re.y - le.y) || 60;
                  drawPhoenixWings(ctx, mx, my, dist, startTimeMs);
                }

                // Draw hands, 3D articulated bones & custom 3D gauntlets
                hands.forEach((landmarks: { x: number; y: number }[], handIdx: number) => {
                  const center = updatedScale.handCenters[handIdx];
                  const isScreenLeft =
                    hands.length >= 2
                      ? handIdx === updatedScale.rightHandIndex
                      : (center?.x ?? 0.5) >= 0.5;

                  let accentColor = isFireActive
                    ? activeCombo >= 5
                      ? "#e879f9"
                      : "#fb923c"
                    : isScreenLeft
                    ? "#22d3ee"
                    : "#c084fc";

                  if (isOverdrive) {
                    accentColor = "#facc15";
                  } else if (equippedGloves === "gloves_blue_flame") {
                    accentColor = "#38bdf8";
                  } else if (equippedGloves === "gloves_boxing") {
                    accentColor = "#ef4444";
                  } else if (equippedGloves === "gloves_cyber") {
                    accentColor = "#10b981";
                  } else if (equippedGloves === "gloves_midas") {
                    accentColor = "#facc15";
                  } else if (equippedGloves === "gloves_dragon_claws") {
                    accentColor = "#f97316";
                  } else if (equippedGloves === "gloves_void_galaxy") {
                    accentColor = "#c084fc";
                  }

                  ctx.save();
                  ctx.lineWidth = isFireActive ? 3.5 : 2.5;
                  ctx.strokeStyle = accentColor;
                  ctx.shadowColor = accentColor;
                  ctx.shadowBlur = 10;
                  ctx.lineCap = "round";

                  // Hand Connections / Bones with 3D Plate styling
                  HAND_CONNECTIONS.forEach(([i, j]) => {
                    const p1 = landmarks[i];
                    const p2 = landmarks[j];
                    if (p1 && p2) {
                      const x1 = (1 - p1.x) * canvas.width;
                      const y1 = p1.y * canvas.height;
                      const x2 = (1 - p2.x) * canvas.width;
                      const y2 = p2.y * canvas.height;

                      ctx.beginPath();
                      ctx.moveTo(x1, y1);
                      ctx.lineTo(x2, y2);
                      ctx.stroke();

                      // 3D Titanium segment plating for Cyber Gauntlets
                      if (equippedGloves === "gloves_cyber") {
                        const midX = (x1 + x2) / 2;
                        const midY = (y1 + y2) / 2;
                        ctx.beginPath();
                        ctx.arc(midX, midY, 3, 0, Math.PI * 2);
                        ctx.fillStyle = "#34d399";
                        ctx.fill();
                      }
                    }
                  });

                  // Landmarks dots, 3D claws & fingertip particles
                  landmarks.forEach((p, idx) => {
                    const x = (1 - p.x) * canvas.width;
                    const y = p.y * canvas.height;
                    const isFingertip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;

                    // 3D Dragon Claws at fingertips
                    if (equippedGloves === "gloves_dragon_claws" && isFingertip) {
                      ctx.save();
                      const talonGrad = ctx.createLinearGradient(x, y, x, y - 18);
                      talonGrad.addColorStop(0, "#1c1917");
                      talonGrad.addColorStop(0.5, "#7f1d1d");
                      talonGrad.addColorStop(1, "#f97316");

                      ctx.beginPath();
                      ctx.moveTo(x - 5, y);
                      ctx.lineTo(x, y - 22);
                      ctx.lineTo(x + 5, y);
                      ctx.closePath();
                      ctx.fillStyle = talonGrad;
                      ctx.shadowColor = "#f97316";
                      ctx.shadowBlur = 12;
                      ctx.fill();
                      ctx.restore();
                    } else {
                      ctx.beginPath();
                      ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
                      ctx.fillStyle = "#ffffff";
                      ctx.fill();
                    }

                    // Emit particles from fingertips
                    if ((isFireActive || equippedGloves !== "gloves_classic") && isFingertip && Math.random() < 0.65) {
                      let particleHue = activeCombo >= 5 ? 280 : 12;
                      if (isOverdrive || equippedGloves === "gloves_midas") particleHue = 45;
                      else if (equippedGloves === "gloves_blue_flame") particleHue = 195;
                      else if (equippedGloves === "gloves_cyber") particleHue = 145;
                      else if (equippedGloves === "gloves_dragon_claws") particleHue = 20;
                      else if (equippedGloves === "gloves_void_galaxy") particleHue = 275;

                      fireParticlesRef.current.push({
                        x: x + (Math.random() - 0.5) * 14,
                        y: y + (Math.random() - 0.5) * 10,
                        vx: (Math.random() - 0.5) * 2.2,
                        vy: -(3.2 + Math.random() * 5),
                        size: 14 + Math.random() * 18,
                        life: 0,
                        maxLife: 16 + Math.random() * 12,
                        hue: particleHue,
                      });
                    }
                  });

                  // Palm Center & 3D Gauntlet Shells
                  if (center) {
                    const cx = (1 - center.x) * canvas.width;
                    const cy = center.y * canvas.height;
                    const orbRadius = Math.max(
                      26,
                      Math.min(60, center.radius * canvas.height * (isFireActive ? 1.05 : 0.8))
                    );

                    // 1. Boxing Glove 3D Shell
                    if (equippedGloves === "gloves_boxing") {
                      ctx.save();
                      const gloveGrad = ctx.createRadialGradient(
                        cx - orbRadius * 0.2,
                        cy - orbRadius * 0.2,
                        2,
                        cx,
                        cy,
                        orbRadius * 1.3
                      );
                      gloveGrad.addColorStop(0, "#fca5a5");
                      gloveGrad.addColorStop(0.35, "#ef4444");
                      gloveGrad.addColorStop(1, "#7f1d1d");

                      ctx.beginPath();
                      ctx.arc(cx, cy, orbRadius * 1.25, 0, Math.PI * 2);
                      ctx.fillStyle = gloveGrad;
                      ctx.shadowColor = "#ef4444";
                      ctx.shadowBlur = 20;
                      ctx.fill();

                      ctx.strokeStyle = "#ffffff";
                      ctx.lineWidth = 3;
                      ctx.stroke();

                      // White specular gloss streak
                      ctx.beginPath();
                      ctx.arc(cx - orbRadius * 0.3, cy - orbRadius * 0.3, orbRadius * 0.5, -0.8, 0.4);
                      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
                      ctx.lineWidth = 3.5;
                      ctx.stroke();

                      ctx.restore();
                    }
                    // 2. Cosmic Void Galaxy in Palm
                    else if (equippedGloves === "gloves_void_galaxy") {
                      ctx.save();
                      const galaxyGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, orbRadius * 1.15);
                      galaxyGrad.addColorStop(0, "#ffffff");
                      galaxyGrad.addColorStop(0.35, "#c084fc");
                      galaxyGrad.addColorStop(0.7, "#581c87");
                      galaxyGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

                      ctx.beginPath();
                      ctx.arc(cx, cy, orbRadius * 1.15, 0, Math.PI * 2);
                      ctx.fillStyle = galaxyGrad;
                      ctx.shadowColor = "#a855f7";
                      ctx.shadowBlur = 25;
                      ctx.fill();

                      // Orbiting planetary ring around wrist
                      const orbitA = startTimeMs * 0.003;
                      ctx.beginPath();
                      ctx.ellipse(cx, cy, orbRadius * 1.25, orbRadius * 0.4, orbitA, 0, Math.PI * 2);
                      ctx.strokeStyle = "rgba(192, 132, 252, 0.75)";
                      ctx.lineWidth = 2.5;
                      ctx.stroke();

                      // Mini planet
                      const px = cx + Math.cos(orbitA * 2) * (orbRadius * 1.25);
                      const py = cy + Math.sin(orbitA * 2) * (orbRadius * 0.4);
                      ctx.beginPath();
                      ctx.arc(px, py, 4, 0, Math.PI * 2);
                      ctx.fillStyle = "#38bdf8";
                      ctx.fill();

                      ctx.restore();
                    }
                    // 3. Standard / Elemental / 3D Midas Gauntlet Orb
                    else {
                      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, orbRadius);
                      if (equippedGloves === "gloves_blue_flame") {
                        grad.addColorStop(0, "#ffffff");
                        grad.addColorStop(0.4, "rgba(56, 189, 248, 0.9)");
                        grad.addColorStop(0.8, "rgba(3, 105, 161, 0.4)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                      } else if (equippedGloves === "gloves_midas" || isOverdrive) {
                        grad.addColorStop(0, "#ffffff");
                        grad.addColorStop(0.4, "rgba(250, 204, 21, 0.95)");
                        grad.addColorStop(0.8, "rgba(180, 83, 9, 0.5)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                      } else if (equippedGloves === "gloves_cyber") {
                        grad.addColorStop(0, "#ffffff");
                        grad.addColorStop(0.4, "rgba(16, 185, 129, 0.9)");
                        grad.addColorStop(0.8, "rgba(6, 78, 59, 0.4)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                      } else if (equippedGloves === "gloves_dragon_claws") {
                        grad.addColorStop(0, "#fef08a");
                        grad.addColorStop(0.4, "rgba(249, 115, 22, 0.9)");
                        grad.addColorStop(0.8, "rgba(153, 27, 27, 0.4)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                      } else if (isFireActive) {
                        grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
                        grad.addColorStop(0.4, activeCombo >= 5 ? "rgba(232, 121, 249, 0.8)" : "rgba(251, 146, 60, 0.85)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                      } else {
                        grad.addColorStop(0, isScreenLeft ? "rgba(34, 211, 238, 0.7)" : "rgba(192, 132, 252, 0.7)");
                        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                      }

                      ctx.beginPath();
                      ctx.arc(cx, cy, orbRadius, 0, 2 * Math.PI);
                      ctx.fillStyle = grad;
                      ctx.fill();

                      ctx.beginPath();
                      ctx.arc(cx, cy, orbRadius * 0.7, 0, 2 * Math.PI);
                      ctx.strokeStyle = accentColor;
                      ctx.lineWidth = 2.5;
                      ctx.stroke();
                    }

                    // 6 / 7 Arcade Number
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

              // 2. RENDER REALISTIC 3D HEADWEAR
              if (lastEyesRef.current && equippedHead !== "head_none") {
                const leftEye = lastEyesRef.current.left;
                const rightEye = lastEyesRef.current.right;
                const timeDiff = startTimeMs - lastEyesRef.current.time;

                if (timeDiff < 2500) {
                  const midEyeX = (leftEye.x + rightEye.x) / 2;
                  const midEyeY = (leftEye.y + rightEye.y) / 2;
                  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 60;
                  const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

                  if (equippedHead === "head_pixel_shades") {
                    drawPixelShades(ctx, midEyeX, midEyeY, eyeDist, eyeAngle);
                  } else if (equippedHead === "head_cyber_visor") {
                    drawCyberVisor(ctx, midEyeX, midEyeY, eyeDist, eyeAngle, startTimeMs);
                  } else if (equippedHead === "head_fire_horns") {
                    drawFireHorns(ctx, midEyeX, midEyeY, eyeDist, eyeAngle, startTimeMs);
                  } else if (equippedHead === "head_golden_crown") {
                    drawGoldenCrown(ctx, midEyeX, midEyeY, eyeDist, eyeAngle, startTimeMs);
                  } else if (equippedHead === "head_angel_halo") {
                    drawAngelHalo(ctx, midEyeX, midEyeY, eyeDist, eyeAngle, startTimeMs);
                  } else if (equippedHead === "head_samurai_oni") {
                    drawSamuraiOniMask(ctx, midEyeX, midEyeY, eyeDist, eyeAngle, startTimeMs);
                  }
                }
              }

              // 3. SHOCKWAVES (Optimized without heavy software blur)
              if (shockwavesRef.current.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";

                const survivingShockwaves: Shockwave[] = [];
                for (const sw of shockwavesRef.current) {
                  sw.radius += isOverdrive ? 26 : 18;
                  sw.alpha *= 0.91;

                  if (sw.radius < sw.maxRadius && sw.alpha > 0.04) {
                    ctx.beginPath();
                    ctx.arc(sw.x, sw.y, sw.radius, 0, 2 * Math.PI);
                    ctx.strokeStyle = sw.color;
                    ctx.lineWidth = Math.max(1.5, 4.5 * sw.alpha);
                    ctx.stroke();

                    survivingShockwaves.push(sw);
                  }
                }
                shockwavesRef.current = survivingShockwaves;
                ctx.restore();
              }

              // 4. PARTICLES (Fast single-pass rendering, capped to 35 for 60fps)
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
                  const alpha = Math.max(0, (1 - progress) * 0.85);
                  const currentRadius = Math.max(2, p.size * (1 - progress * 0.4));

                  ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, currentRadius, 0, 2 * Math.PI);
                  ctx.fill();

                  surviving.push(p);
                }

                fireParticlesRef.current = surviving.slice(-35);
                ctx.restore();
              }

              // 5. EYE LASERS (combo >= 3 or Overdrive)
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

                const laserColor = isOverdrive ? "#facc15" : activeCombo >= 5 ? "#22d3ee" : "#ff1e56";
                const laserOuterGlow = isOverdrive
                  ? "rgba(250, 204, 21, 0.95)"
                  : activeCombo >= 5
                  ? "rgba(34, 211, 238, 0.9)"
                  : "rgba(255, 30, 86, 0.9)";

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
                  ctx.lineWidth = (isOverdrive ? 22 : 16) + Math.sin(startTimeMs * 0.03) * 4;
                  ctx.lineCap = "round";
                  ctx.shadowColor = laserColor;
                  ctx.shadowBlur = 35;
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(eye.x, eye.y);
                  ctx.lineTo(endX, endY);
                  ctx.strokeStyle = laserColor;
                  ctx.lineWidth = isOverdrive ? 11 : 8;
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(eye.x, eye.y);
                  ctx.lineTo(endX, endY);
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = 4;
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
  }, [
    cameraStatus,
    modelLoading,
    handleScore,
    handLandmarkerRef,
    faceDetectorRef,
    videoRef,
    onOverdriveTriggered,
  ]);

  const isCameraActive = cameraStatus === "granted" || cameraStatus === "requesting";

  return (
    <main className="relative flex-1 w-screen overflow-hidden bg-black flex items-center justify-center">
      {/* Video with GPU-friendly cinematic filter during Overdrive */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-all duration-300 ease-out ${
          isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${isBlurred ? "filter blur-xl scale-105 brightness-50" : "filter blur-0 scale-100"} ${
          isOverdriveActive ? "contrast-125 saturate-150 brightness-105" : "brightness-100"
        }`}
      />

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 transition-all duration-500 ease-out ${
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
