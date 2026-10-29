"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useVisionModels() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handLandmarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceDetectorRef = useRef<any>(null);

  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  const initVisionModels = useCallback(async () => {
    try {
      setModelLoading(true);
      setModelError(null);

      const { FilesetResolver, HandLandmarker, FaceDetector } = await import(
        "@mediapipe/tasks-vision"
      );

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
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      handLandmarkerRef.current = landmarker;

      // Load FaceDetector for eye laser tracking
      try {
        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.35,
        });
        faceDetectorRef.current = faceDetector;
      } catch (faceErr) {
        console.warn("Fallback face detector load:", faceErr);
      }

      setModelLoading(false);
    } catch (err: unknown) {
      console.error("Error loading MediaPipe model:", err);
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
        handLandmarkerRef.current = landmarker;
        setModelLoading(false);
      } catch (fallbackErr) {
        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        setModelError(msg || "No se pudo cargar el detector de visión.");
        setModelLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    initVisionModels();
  }, [initVisionModels]);

  return {
    handLandmarkerRef,
    faceDetectorRef,
    modelLoading,
    modelError,
    retryLoading: initVisionModels,
  };
}
