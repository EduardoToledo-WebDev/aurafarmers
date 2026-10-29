// Gesture Detection Engine for Aura Farmers (6 7 Gesture)
// Optimized for the "holding 2 eggs" (cupped palms facing up) alternating motion

export interface HandPoint {
  x: number;
  y: number;
  z?: number;
}

export type HandLandmarks = HandPoint[];

export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17]
];

export interface HandCenter {
  x: number;
  y: number;
  radius: number;
  isCupped: boolean;
}

export interface ScaleState {
  tilt: "neutral" | "left_up" | "right_up";
  deltaY: number;
  normalizedDelta: number;
  leftY: number;
  rightY: number;
  handsCount: number;
  leftHandIndex: number;
  rightHandIndex: number;
  progressPercent: number;
  statusText: string;
  handCenters: HandCenter[];
}

export interface DetectionResult {
  detected: boolean;
  type: "scale_67" | "finger_67" | null;
  message: string;
  pointsAwarded: number;
  handX?: number;
  handY?: number;
}

export class Gesture67Tracker {
  private lastDirection: "up" | "down" | "none" = "none";
  private extremeDeltaY: number = 0;
  private lastSwitchTime: number = 0;
  private cooldownUntil: number = 0;

  // Smoothed positions to handle foreshortened "holding 2 eggs" hand jitter
  private smoothedLeft: { x: number; y: number; time: number } | null = null;
  private smoothedRight: { x: number; y: number; time: number } | null = null;

  // Sensitivity tuned for cupped hands ("holding 2 eggs" posture)
  // Even small rhythmic weighing motions (~2.2% of screen height) are captured
  private readonly SWING_DELTA_THRESHOLD = 0.022;
  private readonly ABSOLUTE_TILT_THRESHOLD = 0.028;
  private readonly COOLDOWN_MS = 260;
  private readonly HAND_MEMORY_MS = 220;

  /**
   * Computes the center of the "egg" held in the palm.
   * When hands are positioned as if holding 2 eggs (palms up, fingers curled toward camera),
   * the palm and fingertips cluster around the metacarpal & proximal phalanges.
   */
  public getEggPalmCenter(landmarks: HandLandmarks): HandCenter {
    // Key points forming the "cup" of the hand (palm + curled fingertips)
    const cupIndices = [0, 5, 9, 13, 17, 4, 8, 12, 16, 20];
    let sumX = 0;
    let sumY = 0;

    for (const idx of cupIndices) {
      const p = landmarks[idx] || landmarks[0];
      sumX += p.x;
      sumY += p.y;
    }

    const cx = sumX / cupIndices.length;
    const cy = sumY / cupIndices.length;

    // Estimate spread/radius of the cupped hand
    let totalDist = 0;
    for (const idx of cupIndices) {
      const p = landmarks[idx] || landmarks[0];
      totalDist += Math.hypot(p.x - cx, p.y - cy);
    }
    const avgRadius = totalDist / cupIndices.length;

    // Check if hand is in the "holding an egg" cupped posture:
    // In this posture, fingertips (8, 12, 16, 20) are relatively close to the palm center
    // rather than fully stretched out vertically.
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const middleTip = landmarks[12];
    const palmLen = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y) || 0.05;
    const tipToMcp = Math.hypot(middleTip.x - middleMcp.x, middleTip.y - middleMcp.y);
    const isCupped = tipToMcp < palmLen * 1.35;

    return {
      x: cx,
      y: cy,
      radius: Math.max(0.03, Math.min(0.12, avgRadius * 1.25)),
      isCupped
    };
  }

  public process(
    hands: HandLandmarks[],
    videoWidth: number,
    videoHeight: number
  ): { scaleState: ScaleState; result: DetectionResult | null } {
    const now = Date.now();

    const handCenters = hands.map((h) => this.getEggPalmCenter(h));

    const scaleState: ScaleState = {
      tilt: "neutral",
      deltaY: 0,
      normalizedDelta: 0,
      leftY: 0.5,
      rightY: 0.5,
      handsCount: hands.length,
      leftHandIndex: -1,
      rightHandIndex: -1,
      progressPercent: 0,
      statusText: "Haz el gesto 6 7",
      handCenters
    };

    // Update smoothed left and right hand positions
    if (hands.length >= 2) {
      const c0 = handCenters[0];
      const c1 = handCenters[1];

      const is0Left = c0.x < c1.x;
      const leftRaw = is0Left ? c0 : c1;
      const rightRaw = is0Left ? c1 : c0;
      scaleState.leftHandIndex = is0Left ? 0 : 1;
      scaleState.rightHandIndex = is0Left ? 1 : 0;

      const alpha = 0.65; // responsive smoothing
      this.smoothedLeft = this.smoothedLeft
        ? {
            x: this.smoothedLeft.x * (1 - alpha) + leftRaw.x * alpha,
            y: this.smoothedLeft.y * (1 - alpha) + leftRaw.y * alpha,
            time: now
          }
        : { x: leftRaw.x, y: leftRaw.y, time: now };

      this.smoothedRight = this.smoothedRight
        ? {
            x: this.smoothedRight.x * (1 - alpha) + rightRaw.x * alpha,
            y: this.smoothedRight.y * (1 - alpha) + rightRaw.y * alpha,
            time: now
          }
        : { x: rightRaw.x, y: rightRaw.y, time: now };
    } else if (hands.length === 1) {
      // If one cupped hand briefly drops for a couple frames during fast motion,
      // match the visible hand to whichever side it is closer to
      const c0 = handCenters[0];
      const isLeft = c0.x < 0.5;
      if (isLeft) {
        scaleState.leftHandIndex = 0;
        this.smoothedLeft = { x: c0.x, y: c0.y, time: now };
      } else {
        scaleState.rightHandIndex = 0;
        this.smoothedRight = { x: c0.x, y: c0.y, time: now };
      }
    }

    const hasRecentLeft =
      this.smoothedLeft !== null && now - this.smoothedLeft.time <= this.HAND_MEMORY_MS;
    const hasRecentRight =
      this.smoothedRight !== null && now - this.smoothedRight.time <= this.HAND_MEMORY_MS;

    if (!hasRecentLeft || !hasRecentRight || !this.smoothedLeft || !this.smoothedRight) {
      return { scaleState, result: null };
    }

    const leftHand = this.smoothedLeft;
    const rightHand = this.smoothedRight;

    // deltaY = leftHand.y - rightHand.y
    // Smaller Y means higher on screen
    const deltaY = leftHand.y - rightHand.y;
    const normalizedDelta = Math.max(-1, Math.min(1, -deltaY / 0.1));

    let currentTilt: "neutral" | "left_up" | "right_up" = "neutral";
    if (deltaY < -this.ABSOLUTE_TILT_THRESHOLD) {
      currentTilt = "left_up";
    } else if (deltaY > this.ABSOLUTE_TILT_THRESHOLD) {
      currentTilt = "right_up";
    }

    scaleState.deltaY = deltaY;
    scaleState.normalizedDelta = normalizedDelta;
    scaleState.leftY = leftHand.y;
    scaleState.rightY = rightHand.y;
    scaleState.tilt = currentTilt;

    // Dynamic peak-to-valley oscillation detector:
    // Works even if the user holds one "egg" naturally slightly higher than the other
    // or makes compact, quick weighing bounces.
    if (this.lastDirection === "none") {
      this.extremeDeltaY = deltaY;
      if (Math.abs(deltaY) > this.SWING_DELTA_THRESHOLD) {
        this.lastDirection = deltaY < 0 ? "up" : "down";
        this.lastSwitchTime = now;
      }
      return { scaleState, result: null };
    }

    if (this.lastDirection === "up") {
      // Tracking left hand going up (deltaY becoming more negative)
      if (deltaY < this.extremeDeltaY) {
        this.extremeDeltaY = deltaY;
      } else if (deltaY - this.extremeDeltaY >= this.SWING_DELTA_THRESHOLD) {
        // Reversed! Now right hand is going up / left hand going down
        const elapsed = now - this.lastSwitchTime;
        this.lastDirection = "down";
        this.extremeDeltaY = deltaY;
        this.lastSwitchTime = now;

        if (elapsed >= 80 && elapsed <= 2200 && now > this.cooldownUntil) {
          this.cooldownUntil = now + this.COOLDOWN_MS;
          return {
            scaleState: {
              ...scaleState,
              progressPercent: 100,
              statusText: "¡6 7!"
            },
            result: {
              detected: true,
              type: "scale_67",
              message: "+67",
              pointsAwarded: 67,
              handX: rightHand.x * videoWidth,
              handY: rightHand.y * videoHeight
            }
          };
        }
      }
    } else if (this.lastDirection === "down") {
      // Tracking right hand going up (deltaY becoming more positive)
      if (deltaY > this.extremeDeltaY) {
        this.extremeDeltaY = deltaY;
      } else if (this.extremeDeltaY - deltaY >= this.SWING_DELTA_THRESHOLD) {
        // Reversed! Now left hand is going up / right hand going down
        const elapsed = now - this.lastSwitchTime;
        this.lastDirection = "up";
        this.extremeDeltaY = deltaY;
        this.lastSwitchTime = now;

        if (elapsed >= 80 && elapsed <= 2200 && now > this.cooldownUntil) {
          this.cooldownUntil = now + this.COOLDOWN_MS;
          return {
            scaleState: {
              ...scaleState,
              progressPercent: 100,
              statusText: "¡6 7!"
            },
            result: {
              detected: true,
              type: "scale_67",
              message: "+67",
              pointsAwarded: 67,
              handX: leftHand.x * videoWidth,
              handY: leftHand.y * videoHeight
            }
          };
        }
      }
    }

    // Reset direction if hands stayed still for too long
    if (now - this.lastSwitchTime > 2500) {
      this.lastDirection = "none";
      this.extremeDeltaY = deltaY;
    }

    return {
      scaleState,
      result: null
    };
  }

  public reset() {
    this.lastDirection = "none";
    this.extremeDeltaY = 0;
    this.lastSwitchTime = 0;
    this.cooldownUntil = 0;
    this.smoothedLeft = null;
    this.smoothedRight = null;
  }
}
