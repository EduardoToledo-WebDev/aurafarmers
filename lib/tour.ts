import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export function startMainMenuTour(lang: "en" | "es", onComplete?: () => void) {
  if (typeof window === "undefined") return null;

  const isEs = lang === "es";

  const steps: DriveStep[] = [
    {
      element: "#tour-help",
      popover: {
        title: isEs ? "👋 ¡Bienvenido a Aura Farmers!" : "👋 Welcome to Aura Farmers!",
        description: isEs
          ? "Esta guía interactiva te enseñará a jugar y dónde picarle en cada sección del menú. Puedes presionar este botón de ayuda (?) cuando quieras para volver a verla."
          : "This interactive tour guides you through all menu features and gameplay controls. Click this help button (?) anytime to replay this tour!",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "#tour-balance",
      popover: {
        title: isEs ? "⚡ Aura Acumulada y Monedas" : "⚡ Aura Balance & Coins",
        description: isEs
          ? "Aquí ves tu Aura total acumulada y tus Monedas de Aura 🟡. Ganas 1 moneda por cada 10 puntos de aura cosechados en tus rondas."
          : "View your total accumulated Aura and your Aura Coins 🟡 balance. You earn 1 coin for every 10 aura points farmed in your rounds.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#tour-play",
      popover: {
        title: isEs ? "🔥 ¡A Jugar!" : "🔥 Play & Farm!",
        description: isEs
          ? "¡Presiona aquí para iniciar tu ronda! Tu cámara detectará tus gestos de manos para subir tu aura y encadenar combos gigantes."
          : "Hit this arcade button to start your session! Computer vision tracks your hand movements in real-time without leaving your device.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#tour-shop",
      popover: {
        title: isEs ? "🛍️ Tienda de Cosméticos 3D" : "🛍️ 3D Cosmetics Shop",
        description: isEs
          ? "Equipa guantes cibernéticos 3D, dragón o fénix, cascos futuristas, coronas luminosas y estelas místicas que siguen tus manos en vivo."
          : "Equip live 3D gauntlets (Cyber, Dragon, Phoenix), neon halos, crowns, and aura trails rendered in real-time onto your skeleton.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#tour-leaderboard",
      popover: {
        title: isEs ? "🏆 Tabla Semanal y Perfil" : "🏆 Weekly Leaderboard & Profile",
        description: isEs
          ? "Compite contra granjeros de todo el mundo. Aquí también puedes copiar o restaurar tu Llave Secreta para nunca perder tu progreso."
          : "Compete against players worldwide. Access your profile, change your nickname, and copy your Secret Key to restore your account anytime.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#tour-settings",
      popover: {
        title: isEs ? "⚙️ Ajustes y Renacer" : "⚙️ Settings & Rebirth",
        description: isEs
          ? "Ajusta el volumen, cambia de canción, alterna la cámara, cambia el idioma o usa la opción 'Renacer' para reiniciar tus puntos de Aura."
          : "Adjust volume, switch music tracks, test camera, switch language, or access the 'Rebirth' feature to reset your points for a fresh start.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#tour-hint",
      popover: {
        title: isEs ? "💥 La Balanza 6 7 y Sobredisparo" : "💥 6 7 Scale & Overdrive",
        description: isEs
          ? "Sube y baja las manos alternadamente (6 7) frente a la cámara. Llena la barra superior de 10,000 pts y ¡cierra los puños y empuja hacia la pantalla para activar Sobredisparo 5X!"
          : "Balance both hands alternately (6 7 gesture). Fill the fine 10,000 pt top energy bar, then close your fists and push toward the camera to unleash 5X Overdrive!",
        side: "top",
        align: "center",
      },
    },
  ];

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayColor: "rgba(0, 0, 0, 0.8)",
    stagePadding: 6,
    stageRadius: 16,
    nextBtnText: isEs ? "Siguiente →" : "Next →",
    prevBtnText: isEs ? "← Anterior" : "← Back",
    doneBtnText: isEs ? "¡Entendido! 🚀" : "Got it! 🚀",
    progressText: isEs ? "{{current}} de {{total}}" : "{{current}} of {{total}}",
    onDestroyed: () => {
      if (typeof window !== "undefined") {
        localStorage.setItem("aurafarmers_tour_completed", "true");
      }
      if (onComplete) onComplete();
    },
    steps,
  });

  driverObj.drive();
  return driverObj;
}
