"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "es";

export const translations = {
  en: {
    // Menu & Top bar
    play: "PLAY",
    leaderboard: "LEADERBOARD",
    settings: "SETTINGS",
    accumulatedAura: "ACCUMULATED AURA",
    hintScale: "Perform the 6 7 scale with both hands in front of the camera to farm Aura",
    aura: "AURA",
    combo: "COMBO",
    endRound: "END ROUND",
    inactivityWarning: "⚠️ Inactive: Round ending in {s}s",
    pointsToBeat: "Need +{pts} pts to overtake {nick} (#{rank})",
    leadingRank1: "👑 #1 Leading the Leaderboard!",
    overdriveActive: "⚡ OVERDRIVE {mult}X ACTIVE! ({s}s)",
    overdriveReady: "👊 PUSH CLOSED FISTS TO ACTIVATE 5X OVERDRIVE!",
    overdriveCooldown: "❄️ COOLDOWN: {s}s",
    pushPalmsHint: "💥 Push both palms forward to unleash Overdrive!",

    // Camera permission
    cameraRequiredTitle: "Camera Access Required",
    cameraDeniedTitle: "Camera Permission Denied",
    cameraRequiredDesc:
      "Aura Farmers uses real-time computer vision to detect your 6 7 hand gestures. Your images never leave your device.",
    cameraDeniedDesc:
      "Your browser blocked camera access. Please click the lock icon in your browser address bar to allow camera access, then retry.",
    allowCamera: "ALLOW & START",
    retryCamera: "RETRY CONNECTION",

    // Countdown
    startFarming: "START FARMING!",

    // Summary modal
    roundCompleted: "ROUND COMPLETED!",
    roundSummaryDesc: "Summary of your Aura farming session",
    auraEarned: "AURA EARNED",
    maxCombo: "MAX COMBO",
    leaderboardPosition: "LEADERBOARD POSITION",
    climbedRanks: "You climbed +{n} rank{s} this round! 🚀",
    stillNumberOne: "👑 You remain the undisputed #1 this week!",
    maintainedRank: "Maintained Rank #{rank}",
    needMorePoints: "Need +{pts} pts to overtake {nick} (#{rank})",
    playAgain: "PLAY AGAIN",
    mainMenu: "MAIN MENU",

    // Settings
    settingsTitle: "SETTINGS",
    camera: "Camera",
    enable: "Enable",
    disable: "Disable",
    backgroundMusic: "Background Music",
    musicVolume: "Music Volume",
    nowPlaying: "Now Playing",
    nextSong: "Next Song",
    prevSong: "Previous Song",
    muted: "Muted",
    active: "Active",
    profileAndKey: "Profile & Secret Recovery Key",
    reconnectCamera: "Restart camera",
    language: "Language",
    english: "English (US)",
    spanish: "Español",

    // Leaderboard Modal
    weeklyLeaderboard: "Weekly Leaderboard",
    weeklyDesc: "Compete for the most legendary Aura of the week",
    tabLeaderboard: "Leaderboard",
    tabProfile: "My Profile & Key",
    loadingScores: "Loading scores...",
    champion: "#1 Champion",
    you: "YOU",
    noScoresYet: "No scores registered yet this week",
    beTheFirst: "Be the first to perform the 6 7 gesture on camera and claim the #1 spot!",
    yourPosition: "(Your position)",
    auraPointsSuffix: "Aura points",
    yourNicknameTitle: "Your Leaderboard Nickname",
    nicknamePlaceholder: "e.g. AuraGod67",
    save: "Save",
    saving: "Saving...",
    nicknameUpdated: "Nickname updated successfully!",
    secretKeyTitle: "Secret Profile Key",
    saveThisKey: "Keep this key safe",
    secretKeyDesc: "If you play on another device or clear your browser cache, enter this key to restore your points and leaderboard rank.",
    copy: "Copy",
    copied: "Copied",
    restoreAccountTitle: "Restore Existing Account",
    restoreAccountDesc: "Already have points from another computer? Enter your secret key to restore your profile on this browser.",
    keyPlaceholder: "AURA-XXXX",
    restore: "Restore",
    restoring: "Searching...",
    restoreSuccess: "Profile and points restored successfully!",
    restoreError: "Key not found or invalid. Please check capital letters.",

    // Shop
    shop: "SHOP",
    shopTitle: "AURA COSMETICS SHOP",
    shopSubtitle: "Customize your hand gauntlets, headgear and mystical auras",
    coins: "Aura Coins",
    coinsEarned: "COINS EARNED",
    coinsBalance: "Coins Balance",
    categoryAll: "ALL",
    categoryGloves: "GLOVES",
    categoryHead: "HEADWEAR",
    categoryAura: "AURAS",
    buy: "BUY",
    equip: "EQUIP",
    equipped: "EQUIPPED",
    free: "FREE",
    notEnoughCoins: "Need +{amount} more coins!",
    needMoreCoinsHint: "Farm aura points in rounds to earn coins (10 pts = 1 coin)",
    buySuccess: "Item unlocked & equipped!",
    equipSuccess: "Item equipped!",

    // Tour Guide
    tourGuide: "Interactive Guide (?)",
    tourStartHelp: "Show interactive guide",

    // Rebirth
    rebirth: "Rebirth",
    rebirthDesc: "Reset your Aura points back to 0 for a fresh start",
    rebirthModalTitle: "AURA REBIRTH",
    rebirthWarning: "⚠️ This action is permanent and IRREVERSIBLE! Your total Aura points will be reset to 0, and your weekly leaderboard score will reset to 0.",
    rebirthKeepNote: "You will keep your unlocked cosmetics, your coins, and your secret recovery key.",
    rebirthConfirmPrompt: "To confirm this rebirth, type your nickname exactly:",
    rebirthTypePlaceholder: "Type your nickname here",
    rebirthConfirmBtn: "CONFIRM REBIRTH",
    rebirthCancelBtn: "Cancel",
    rebirthSuccess: "✨ Rebirth complete! Your Aura has returned to zero.",
    rebirthMismatchError: "Nickname does not match. Please verify spelling.",
  },
  es: {
    // Menu & Top bar
    play: "JUGAR",
    shop: "TIENDA",
    leaderboard: "TOP SEMANAL",
    settings: "AJUSTES",
    accumulatedAura: "AURA ACUMULADA",
    hintScale: "Haz la Balanza 6 7 frente a la cámara para farmear Aura",
    aura: "AURA",
    combo: "COMBO",
    endRound: "TERMINAR",
    inactivityWarning: "⚠️ Inactivo: La ronda terminará en {s}s",
    pointsToBeat: "Faltan +{pts} pts para superar a {nick} (#{rank})",
    leadingRank1: "👑 ¡Puesto #1 Liderando la Tabla!",
    overdriveActive: "⚡ ¡SOBREDISPARO {mult}X ACTIVO! ({s}s)",
    overdriveReady: "👊 ¡CIERRA LOS PUÑOS Y EMPUJA PARA ACTIVAR 5X!",
    overdriveCooldown: "❄️ RECARGA: {s}s",
    pushPalmsHint: "💥 ¡Cierra los puños y empuja hacia la pantalla para activar Sobredisparo!",

    // Camera permission
    cameraRequiredTitle: "Se Requiere Cámara",
    cameraDeniedTitle: "Permiso de Cámara Denegado",
    cameraRequiredDesc:
      "Aura Farmers utiliza visión por computadora en tiempo real para detectar tus gestos de manos 6 7. Tus imágenes nunca salen de tu dispositivo.",
    cameraDeniedDesc:
      "Tu navegador bloqueó el acceso a la cámara. Por favor haz clic en el icono del candado en la barra de tu navegador para permitir la cámara y luego presiona reintentar.",
    allowCamera: "PERMITIR Y COMENZAR",
    retryCamera: "REINTENTAR CONEXIÓN",

    // Countdown
    startFarming: "¡EMPIEZA A FARMEAR!",

    // Summary modal
    roundCompleted: "¡RONDA COMPLETADA!",
    roundSummaryDesc: "Resumen de tu sesión de farmeo de Aura",
    auraEarned: "AURA GANADA",
    maxCombo: "COMBO MÁXIMO",
    leaderboardPosition: "POSICIÓN EN LA TABLA",
    climbedRanks: "¡Escalaste +{n} puesto{s} esta ronda! 🚀",
    stillNumberOne: "👑 ¡Sigues como el #1 indiscutible de la semana!",
    maintainedRank: "Mantienes el Puesto #{rank}",
    needMorePoints: "Te faltan {pts} pts para superar a {nick} (#{rank})",
    playAgain: "VOLVER A JUGAR",
    mainMenu: "MENÚ PRINCIPAL",

    // Settings
    settingsTitle: "AJUSTES",
    camera: "Cámara",
    enable: "Activar",
    disable: "Desactivar",
    backgroundMusic: "Música de fondo",
    musicVolume: "Volumen de música",
    nowPlaying: "Sonando ahora",
    nextSong: "Siguiente canción",
    prevSong: "Canción anterior",
    muted: "Silenciada",
    active: "Activa",
    profileAndKey: "Perfil y Llave de Recuperación",
    reconnectCamera: "Reiniciar cámara",
    language: "Idioma",
    english: "English (US)",
    spanish: "Español",

    // Leaderboard Modal
    weeklyLeaderboard: "Clasificación Semanal",
    weeklyDesc: "Compite por el aura más legendaria de la semana",
    tabLeaderboard: "Tabla de Líderes",
    tabProfile: "Mi Perfil y Llave",
    loadingScores: "Cargando puntuaciones...",
    champion: "#1 Campeón",
    you: "TÚ",
    noScoresYet: "Aún no hay puntuaciones esta semana",
    beTheFirst: "¡Sé el primero en hacer el gesto 6 7 frente a la cámara y reclamar el puesto #1!",
    yourPosition: "(Tu posición)",
    auraPointsSuffix: "puntos de Aura",
    yourNicknameTitle: "Tu Apodo en la Tabla",
    nicknamePlaceholder: "Ej. AuraGod67",
    save: "Guardar",
    saving: "Guardando...",
    nicknameUpdated: "¡Apodo actualizado con éxito!",
    secretKeyTitle: "Llave Secreta de Perfil",
    saveThisKey: "Guarda esta clave",
    secretKeyDesc: "Si juegas en otra PC o borras la caché, introduce esta llave para recuperar tus puntos y puesto en la tabla.",
    copy: "Copiar",
    copied: "Copiado",
    restoreAccountTitle: "Restaurar Cuenta Existente",
    restoreAccountDesc: "¿Ya tenías puntos en otra computadora? Escribe tu llave para restaurarla en este navegador.",
    keyPlaceholder: "AURA-XXXX",
    restore: "Restaurar",
    restoring: "Buscando...",
    restoreSuccess: "¡Perfil y puntos restaurados correctamente!",
    restoreError: "Llave no encontrada o inválida. Revisa mayúsculas.",

    // Shop
    shopTitle: "TIENDA DE COSMÉTICOS",
    shopSubtitle: "Personaliza tus guanteletes, accesorios de cabeza y estelas místicas",
    coins: "Monedas de Aura",
    coinsEarned: "MONEDAS GANADAS",
    coinsBalance: "Balance de Monedas",
    categoryAll: "TODOS",
    categoryGloves: "GUANTES",
    categoryHead: "ACCESORIOS",
    categoryAura: "ESTELAS",
    buy: "COMPRAR",
    equip: "EQUIPAR",
    equipped: "EQUIPADO",
    free: "GRATIS",
    notEnoughCoins: "¡Te faltan +{amount} monedas!",
    needMoreCoinsHint: "Farmea puntos en las rondas para conseguir monedas (10 pts = 1 moneda)",
    buySuccess: "¡Objeto desbloqueado y equipado!",
    equipSuccess: "¡Objeto equipado!",

    // Tour Guide
    tourGuide: "Guía Interactiva (?)",
    tourStartHelp: "Ver guía interactiva",

    // Rebirth
    rebirth: "Renacer",
    rebirthDesc: "Reinicia tus puntos de Aura a 0 para un nuevo comienzo",
    rebirthModalTitle: "RENACER AURA",
    rebirthWarning: "⚠️ ¡Esta acción es permanente e IRREVERSIBLE! Tus puntos totales de Aura se reiniciarán a 0 y tu puntaje en la tabla semanal también se reiniciará a 0.",
    rebirthKeepNote: "Conservarás tus cosméticos desbloqueados, tus monedas y tu llave secreta de recuperación.",
    rebirthConfirmPrompt: "Para confirmar el renacer, escribe tu apodo exactamente:",
    rebirthTypePlaceholder: "Escribe tu apodo aquí",
    rebirthConfirmBtn: "CONFIRMAR RENACER",
    rebirthCancelBtn: "Cancelar",
    rebirthSuccess: "✨ ¡Renacer completado! Tu Aura ha vuelto a cero.",
    rebirthMismatchError: "El apodo no coincide. Verifica que esté escrito igual.",
  },
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.en, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => translations.en[key] || String(key),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aurafarmers_lang") as Language | null;
      if (saved === "en" || saved === "es") {
        setLangState(saved);
      }
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("aurafarmers_lang", newLang);
    }
  };

  const t = (key: keyof typeof translations.en, params?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.en;
    let str = dict[key] || translations.en[key] || String(key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
