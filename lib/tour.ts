import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export interface TourStepConfig {
  audioSrc: string;
  element: string;
  titleEn: string;
  titleEs: string;
  descEn: string;
  descEs: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

// 12 Exact steps matching each spoken line of guionAudio.txt with 100% precision
export const TOUR_STEPS: TourStepConfig[] = [
  {
    audioSrc: "/audio/tour/step_0.mp3",
    element: "#tour-help",
    titleEn: "👋 Welcome to Aura Farmers!",
    titleEs: "👋 ¡Bienvenido a Aura Farmers!",
    descEn:
      '🎙️ "Welcome to aura farmers, the objective of the game is become the player with the most aura in the world, you need use your camera and start to farm much aura, make aura movements and don’t be shy, just move and enjoy the game."',
    descEs:
      '🎙️ "Bienvenido a Aura Farmers: el objetivo es convertirte en el jugador con más aura del mundo. Usa tu cámara, haz movimientos de aura, muévete sin pena y disfruta el juego."',
    side: "bottom",
    align: "end",
  },
  {
    audioSrc: "/audio/tour/step_1.mp3",
    element: "#tour-play",
    titleEn: "🔥 1. Start Game & Camera",
    titleEs: "🔥 1. Iniciar Juego y Cámara",
    descEn:
      '🎙️ "-To start the game open your camera." Click this PLAY button to start farming Aura with computer vision.',
    descEs:
      '🎙️ "-To start the game open your camera." Presiona este botón JUGAR y activa tu cámara para comenzar a farmear.',
    side: "top",
    align: "center",
  },
  {
    audioSrc: "/audio/tour/step_2.mp3",
    element: "#tour-audio",
    titleEn: "🎵 2. Turn On the Music",
    titleEs: "🎵 2. Encender la Música",
    descEn:
      '🎙️ "-To turn on the music press the music button." Click this icon in the top right to start the soundtrack.',
    descEs:
      '🎙️ "-To turn on the music press the music button." Haz clic en la bocina arriba a la derecha para iniciar la música.',
    side: "bottom",
    align: "end",
  },
  {
    audioSrc: "/audio/tour/step_3.mp3",
    element: "#tour-hint",
    titleEn: "⚡ 3. Farm Aura Movements",
    titleEs: "⚡ 3. Movimientos de Aura (6 7)",
    descEn:
      '🎙️ "-To farm some aura make aura movements." Alternate both hands up and down (6 7 gesture) in front of the camera.',
    descEs:
      '🎙️ "-To farm some aura make aura movements." Balancea ambas manos arriba y abajo alternadamente frente a la cámara.',
    side: "top",
    align: "center",
  },
  {
    audioSrc: "/audio/tour/step_4.mp3",
    element: "#tour-settings",
    titleEn: "🔄 4. Rebirth Button",
    titleEs: "🔄 4. Botón Renacer (Rebirth)",
    descEn:
      '🎙️ "-To restart your points press the rebirth button." Inside Settings, click Rebirth and type your nickname to reset Aura points.',
    descEs:
      '🎙️ "-To restart your points press the rebirth button." Dentro de Ajustes encontrarás el botón Renacer para reiniciar tus puntos.',
    side: "top",
    align: "center",
  },
  {
    audioSrc: "/audio/tour/step_5.mp3",
    element: "#tour-leaderboard",
    titleEn: "🏆 5. Leaderboard & Ranking",
    titleEs: "🏆 5. Tabla de Clasificación",
    descEn:
      '🎙️ "-To check the leader board press the ranking button." View global weekly rankings and see who is #1 in the world.',
    descEs:
      '🎙️ "-To check the leader board press the ranking button." Consulta las puntuaciones semanales mundiales y el puesto #1.',
    side: "top",
    align: "center",
  },
  {
    audioSrc: "/audio/tour/step_6.mp3",
    element: "#tour-audio",
    titleEn: "🔇 6. Mute the Music",
    titleEs: "🔇 6. Silenciar la Música",
    descEn:
      '🎙️ "-To mute the song press the music button again." Click this same audio icon anytime to mute or unmute.',
    descEs:
      '🎙️ "-To mute the song press the music button again." Presiona nuevamente este botón de audio para silenciar la música.',
    side: "bottom",
    align: "end",
  },
  {
    audioSrc: "/audio/tour/step_7.mp3",
    element: "#tour-balance",
    titleEn: "💾 7. Save Your Progress",
    titleEs: "💾 7. Guardar Progreso",
    descEn:
      '🎙️ "-To save your progress press the save button." Your points & coins save automatically, and your Secret Key is backed up in Profile.',
    descEs:
      '🎙️ "-To save your progress press the save button." Tus puntos y monedas se guardan solos, y puedes respaldar tu Llave Secreta en Perfil.',
    side: "bottom",
    align: "start",
  },
  {
    audioSrc: "/audio/tour/step_8.mp3",
    element: "#tour-settings",
    titleEn: "⚙️ 8. Pause the Match",
    titleEs: "⚙️ 8. Pausar la Partida",
    descEn:
      '🎙️ "-To pause the match press the settings button." Click Settings during a match whenever you need to take a break.',
    descEs:
      '🎙️ "-To pause the match press the settings button." Presiona Ajustes durante una ronda para pausar la partida.',
    side: "top",
    align: "center",
  },
  {
    audioSrc: "/audio/tour/step_9.mp3",
    element: "#tour-play",
    titleEn: "⏱️ 9. Continue the Match",
    titleEs: "⏱️ 9. Continuar Partida",
    descEn:
      '🎙️ "-To continue the match wait the count to three." When resuming, a 3-second countdown will prepare you to farm again.',
    descEs:
      '🎙️ "-To continue the match wait the count to three." Al reanudar, espera la cuenta regresiva de 3 segundos.',
    side: "top",
    align: "center",
  },
  {
    audioSrc: "/audio/tour/step_10.mp3",
    element: "#tour-shop",
    titleEn: "🛍️ 10. Change Avatar & Shop",
    titleEs: "🛍️ 10. Cambiar Avatar y Tienda",
    descEn:
      '🎙️ "-To change your avatar press the shop button." Equip 3D gauntlets, neon crowns, and mystical aura trails.',
    descEs:
      '🎙️ "-To change your avatar press the shop button." Entra a la Tienda para equipar guantes 3D, cascos cyberpunk y estelas de aura.',
    side: "top",
    align: "center",
  },
  {
    audioSrc: "/audio/tour/step_11.mp3",
    element: "#tour-hint",
    titleEn: "🚀 11. Golden Rules & Enjoy!",
    titleEs: "🚀 11. Reglas de Oro y ¡A Disfrutar!",
    descEn:
      '🎙️ "-Don’t try to farm aura without the camera, don’t stay still in the camera, don’t close the web browser during the match, don’t try farm aura in a dark room, don’t be shy and enjoy!"',
    descEs:
      '🎙️ "No farmees sin cámara, no te quedes quieto, no cierres el navegador, no juegues a oscuras, ¡muévete sin pena y disfruta!"',
    side: "top",
    align: "center",
  },
];

let currentStepAudio: HTMLAudioElement | null = null;

export function startMainMenuTour(lang: "en" | "es", onComplete?: () => void) {
  if (typeof window === "undefined") return null;

  const isEs = lang === "es";

  // Stop any active tour voice
  if (currentStepAudio) {
    currentStepAudio.pause();
    currentStepAudio.currentTime = 0;
    currentStepAudio = null;
  }

  // Duck other playing audio elements (background music) to 15%
  const otherAudios = Array.from(document.querySelectorAll<HTMLAudioElement>("audio"));
  const originalVolumes = new Map<HTMLAudioElement, number>();
  otherAudios.forEach((el) => {
    originalVolumes.set(el, el.volume);
    el.volume = Math.max(0, el.volume * 0.15);
  });

  const restoreAudios = () => {
    otherAudios.forEach((el) => {
      const orig = originalVolumes.get(el);
      if (typeof orig === "number") {
        el.volume = orig;
      }
    });
  };

  const playStepAudio = (index: number) => {
    if (currentStepAudio) {
      currentStepAudio.pause();
      currentStepAudio.currentTime = 0;
      currentStepAudio = null;
    }

    const step = TOUR_STEPS[index];
    if (!step?.audioSrc) return;

    const audio = new Audio(step.audioSrc);
    currentStepAudio = audio;
    audio.play().catch(() => {
      // Ignored if browser blocks
    });
  };

  const steps: DriveStep[] = TOUR_STEPS.map((s, index) => ({
    element: s.element,
    popover: {
      title: `<div style="display:flex;align-items:center;gap:6px;"><span style="color:#22d3ee;font-size:11px;font-family:monospace;border:1px solid rgba(34,211,238,0.4);background:rgba(8,145,178,0.25);padding:1px 6px;border-radius:6px;">🎙️ AUDIO [${index + 1}/${TOUR_STEPS.length}]</span></div><div style="margin-top:4px;">${isEs ? s.titleEs : s.titleEn}</div>`,
      description: isEs ? s.descEs : s.descEn,
      side: s.side || "top",
      align: s.align || "center",
    },
  }));

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayColor: "rgba(0, 0, 0, 0.8)",
    stagePadding: 6,
    stageRadius: 16,
    nextBtnText: isEs ? "Siguiente →" : "Next →",
    prevBtnText: isEs ? "← Anterior" : "← Back",
    doneBtnText: isEs ? "¡Listo! 🚀" : "Got it! 🚀",
    progressText: isEs ? "{{current}} de {{total}}" : "{{current}} of {{total}}",
    onHighlightStarted: () => {
      const state = driverObj.getState();
      const currentIdx = state?.activeIndex ?? 0;
      playStepAudio(currentIdx);
    },
    onDestroyed: () => {
      if (currentStepAudio) {
        currentStepAudio.pause();
        currentStepAudio.currentTime = 0;
        currentStepAudio = null;
      }
      restoreAudios();

      if (typeof window !== "undefined") {
        localStorage.setItem("aurafarmers_tour_completed", "true");
      }
      if (onComplete) onComplete();
    },
    steps,
  });

  // Start at step 0 manually
  driverObj.drive(0);

  return driverObj;
}
