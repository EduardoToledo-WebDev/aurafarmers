// Gesture Detection Engine for Aura Farmers (6 7 Gesture)

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

export interface ScaleState {
  tilt: "neutral" | "left_up" | "right_up";
  deltaY: number; // y_left - y_right
  normalizedDelta: number; // -1 to 1
  leftY: number;
  rightY: number;
  handsCount: number;
  leftHandIndex: number;
  rightHandIndex: number;
  progressPercent: number; // 0 to 100 for visual feedback
  statusText: string;
}

export interface DetectionResult {
  detected: boolean;
  type: "scale_67" | "finger_67" | null;
  message: string;
  pointsAwarded: number;
  handX?: number; // Screen coords for floating particle
  handY?: number;
}

export class Gesture67Tracker {
  private lastTilt: "neutral" | "left_up" | "right_up" = "neutral";
  private lastSwitchTime: number = 0;
  private oscillationCount: number = 0;
  private cooldownUntil: number = 0;
  private lastFingerTotal: number = 0;
  private fingerSequence: number[] = [];
  private fingerSequenceTime: number = 0;

  // Thresholds for tilt detection
  private readonly TILT_THRESHOLD = 0.055; // vertical difference
  private readonly COOLDOWN_MS = 380; // minimum ms between scored 67s

  // Count extended fingers for a single hand
  public countExtendedFingers(landmarks: HandLandmarks): number {
    if (!landmarks || landmarks.length < 21) return 0;
    let count = 0;

    // Wrist
    const wrist = landmarks[0];

    // Thumb: compare tip (4) distance from pinky MCP (17) vs IP (3) distance
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const pinkyMcp = landmarks[17];
    const distTip = Math.hypot(thumbTip.x - pinkyMcp.x, thumbTip.y - pinkyMcp.y);
    const distIp = Math.hypot(thumbIp.x - pinkyMcp.x, thumbIp.y - pinkyMcp.y);
    if (distTip > distIp * 1.15) {
      count++;
    }

    // Fingers: Index (8), Middle (12), Ring (16), Pinky (20)
    // Extended if tip is higher than PIP (in image space, smaller Y is higher)
    const fingerIndices = [
      { tip: 8, pip: 6, mcp: 5 },
      { tip: 12, pip: 10, mcp: 9 },
      { tip: 16, pip: 14, mcp: 13 },
      { tip: 20, pip: 18, mcp: 17 }
    ];

    for (const finger of fingerIndices) {
      const tip = landmarks[finger.tip];
      const pip = landmarks[finger.pip];
      const mcp = landmarks[finger.mcp];

      // Distance from wrist to tip vs wrist to pip
      const distWristTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const distWristPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);

      if (distWristTip > distWristPip * 1.08 && tip.y < pip.y + 0.03) {
        count++;
      }
    }

    return count;
  }

  // Analyze frames and check for 67 gesture
  public process(
    hands: HandLandmarks[],
    videoWidth: number,
    videoHeight: number
  ): { scaleState: ScaleState; result: DetectionResult | null } {
    const now = Date.now();

    // Default neutral state
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
      statusText: "Coloca ambas manos frente a la cámara"
    };

    if (hands.length < 1) {
      return {
        scaleState,
        result: null
      };
    }

    // 1. Check Finger-based 6 & 7 combo (e.g. 6 fingers then 7 fingers)
    let totalFingers = 0;
    for (const hand of hands) {
      totalFingers += this.countExtendedFingers(hand);
    }

    if (totalFingers === 6 || totalFingers === 7) {
      if (now - this.fingerSequenceTime > 2500) {
        this.fingerSequence = [];
      }

      if (this.fingerSequence.length === 0 && totalFingers === 6) {
        this.fingerSequence.push(6);
        this.fingerSequenceTime = now;
      } else if (
        this.fingerSequence.length === 1 &&
        this.fingerSequence[0] === 6 &&
        totalFingers === 7 &&
        now - this.fingerSequenceTime > 300 &&
        now > this.cooldownUntil
      ) {
        // Sequenced 6 then 7!
        this.fingerSequence = [];
        this.cooldownUntil = now + this.COOLDOWN_MS;

        return {
          scaleState: {
            ...scaleState,
            statusText: "¡COMBO DEDOS 6-7 COMPLETADO!"
          },
          result: {
            detected: true,
            type: "finger_67",
            message: "¡6 7 CON DEDOS! 🔥",
            pointsAwarded: 67,
            handX: videoWidth * 0.5,
            handY: videoHeight * 0.4
          }
        };
      }
    }

    // 2. Classic Seesaw / Balance 6 7 Gesture (Requires 2 hands)
    if (hands.length >= 2) {
      // Find which hand is on the left and which is on the right
      // Average center X and center Y for hand 0 and hand 1
      const center0 = {
        x: (hands[0][0].x + hands[0][9].x) / 2,
        y: (hands[0][0].y + hands[0][9].y) / 2
      };
      const center1 = {
        x: (hands[1][0].x + hands[1][9].x) / 2,
        y: (hands[1][0].y + hands[1][9].y) / 2
      };

      let leftHand = center0.x < center1.x ? center0 : center1;
      let rightHand = center0.x < center1.x ? center1 : center0;
      let leftIdx = center0.x < center1.x ? 0 : 1;
      let rightIdx = center0.x < center1.x ? 1 : 0;

      // Note: in canvas coords, y is 0 at top, 1 at bottom.
      // So smaller Y = higher hand!
      // deltaY = leftHand.y - rightHand.y
      // If deltaY < -TILT: left is higher than right (LEFT_UP)
      // If deltaY > +TILT: right is higher than left (RIGHT_UP)
      const deltaY = leftHand.y - rightHand.y;
      const normalizedDelta = Math.max(-1, Math.min(1, -deltaY / 0.15));

      let currentTilt: "neutral" | "left_up" | "right_up" = "neutral";
      if (deltaY < -this.TILT_THRESHOLD) {
        currentTilt = "left_up";
      } else if (deltaY > this.TILT_THRESHOLD) {
        currentTilt = "right_up";
      }

      scaleState.deltaY = deltaY;
      scaleState.normalizedDelta = normalizedDelta;
      scaleState.leftY = leftHand.y;
      scaleState.rightY = rightHand.y;
      scaleState.leftHandIndex = leftIdx;
      scaleState.rightHandIndex = rightIdx;
      scaleState.tilt = currentTilt;

      // Progress indication
      if (this.lastTilt === "neutral") {
        if (currentTilt !== "neutral") {
          this.lastTilt = currentTilt;
          this.lastSwitchTime = now;
          this.oscillationCount = 1;
          scaleState.progressPercent = 50;
          scaleState.statusText = currentTilt === "left_up"
            ? "👉 ¡Ahora baja la izquierda y sube la derecha!"
            : "👈 ¡Ahora baja la derecha y sube la izquierda!";
        } else {
          scaleState.progressPercent = 10;
          scaleState.statusText = "Sube una mano y baja la otra (Balanza 6 7)";
        }
      } else {
        // We were previously tilted in one direction
        if (currentTilt !== "neutral" && currentTilt !== this.lastTilt) {
          // Tilt flipped! (left_up -> right_up or right_up -> left_up)
          const timeSinceSwitch = now - this.lastSwitchTime;

          if (timeSinceSwitch > 150 && timeSinceSwitch < 2000 && now > this.cooldownUntil) {
            // Completed alternation!
            this.lastTilt = currentTilt;
            this.lastSwitchTime = now;
            this.oscillationCount++;
            this.cooldownUntil = now + this.COOLDOWN_MS;

            const targetHand = currentTilt === "left_up" ? leftHand : rightHand;

            return {
              scaleState: {
                ...scaleState,
                progressPercent: 100,
                statusText: "¡6 7 DETECTADO! ⚖️💥"
              },
              result: {
                detected: true,
                type: "scale_67",
                message: "+67 AURA",
                pointsAwarded: 67,
                handX: targetHand.x * videoWidth,
                handY: targetHand.y * videoHeight
              }
            };
          } else {
            this.lastTilt = currentTilt;
            this.lastSwitchTime = now;
            scaleState.progressPercent = 60;
            scaleState.statusText = "¡Continúa alternando las manos!";
          }
        } else if (currentTilt === this.lastTilt) {
          scaleState.progressPercent = 50;
          scaleState.statusText = currentTilt === "left_up"
            ? "👉 ¡Ahora invierte: sube la derecha!"
            : "👈 ¡Ahora invierte: sube la izquierda!";
        } else {
          scaleState.progressPercent = 25;
          scaleState.statusText = "Mantén el ritmo de la balanza 6 7";
        }
      }
    } else {
      scaleState.statusText = "Muestra tu segunda mano para activar la balanza 6 7";
    }

    return {
      scaleState,
      result: null
    };
  }

  public reset() {
    this.lastTilt = "neutral";
    this.lastSwitchTime = 0;
    this.oscillationCount = 0;
    this.cooldownUntil = 0;
    this.fingerSequence = [];
  }
}
