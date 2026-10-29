"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { sounds } from "@/lib/audio";

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

export const PLAYLIST: Track[] = [
  {
    id: "aura",
    title: "AURA",
    artist: "Ogryzek",
    src: "/music/ogryzek-aura.mp3",
  },
  {
    id: "passo",
    title: "PASSO BEM SOLTO",
    artist: "Slowed Phonk",
    src: "/music/passo-bem-solto.mp3",
  },
  {
    id: "tiki",
    title: "TIKI TIKI",
    artist: "Dark Phonk Bass Boosted",
    src: "/music/tiki-tiki.mp3",
  },
];

export function useBackgroundMusic() {
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.5);
  const [musicMuted, setMusicMuted] = useState<boolean>(false);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);

  const trackIndexRef = useRef<number>(0);
  const volumeRef = useRef<number>(0.5);
  const isMutedRef = useRef<boolean>(false);

  // Initialize saved volume from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedVol = localStorage.getItem("aurafarmers_music_volume");
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        setVolumeState(parsed);
        volumeRef.current = parsed;
        if (bgMusicRef.current) {
          bgMusicRef.current.volume = parsed;
        }
      }
    }
  }, []);

  // Pick random next track without repeating the current one
  const getNextRandomIndex = useCallback((currentIndex: number) => {
    if (PLAYLIST.length <= 1) return 0;
    const available = [];
    for (let i = 0; i < PLAYLIST.length; i++) {
      if (i !== currentIndex) available.push(i);
    }
    const randomIndex = available[Math.floor(Math.random() * available.length)];
    return randomIndex;
  }, []);

  // Play a specific track index
  const playTrack = useCallback((index: number, autoStart = true) => {
    const track = PLAYLIST[index];
    if (!track) return;

    trackIndexRef.current = index;
    setCurrentTrackIndex(index);

    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio();
    }

    const audio = bgMusicRef.current;
    audio.src = track.src;
    audio.volume = volumeRef.current;
    audio.muted = isMutedRef.current;
    audio.loop = false; // We use "ended" event to randomly pick the next track!

    if (autoStart && !isMutedRef.current) {
      audio.play().catch(() => {
        // Autoplay may wait for user interaction
      });
    }
  }, []);

  // Next track (random, no repeat)
  const nextTrack = useCallback(() => {
    const nextIdx = getNextRandomIndex(trackIndexRef.current);
    playTrack(nextIdx, true);
  }, [getNextRandomIndex, playTrack]);

  // Previous track
  const prevTrack = useCallback(() => {
    const prevIdx =
      (trackIndexRef.current - 1 + PLAYLIST.length) % PLAYLIST.length;
    playTrack(prevIdx, true);
  }, [playTrack]);

  // Volume setter
  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    volumeRef.current = clamped;

    if (bgMusicRef.current) {
      bgMusicRef.current.volume = clamped;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("aurafarmers_music_volume", clamped.toString());
    }
  }, []);

  // Set up audio lifecycle on mount
  useEffect(() => {
    const audio = new Audio();
    audio.loop = false;
    audio.volume = volumeRef.current;
    bgMusicRef.current = audio;

    const handlePlay = () => setMusicPlaying(true);
    const handlePause = () => setMusicPlaying(false);
    const handleEnded = () => {
      // Rule: Randomly pick next song without repeating the current one!
      const nextIdx = getNextRandomIndex(trackIndexRef.current);
      playTrack(nextIdx, true);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    // Initial track
    const randomStart = Math.floor(Math.random() * PLAYLIST.length);
    playTrack(randomStart, false);

    // Unlock audio on first user gesture
    const unlockOnGesture = () => {
      if (bgMusicRef.current && !bgMusicRef.current.muted && bgMusicRef.current.paused) {
        bgMusicRef.current.play().catch(() => {});
      }
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
    };

    window.addEventListener("pointerdown", unlockOnGesture);
    window.addEventListener("keydown", unlockOnGesture);

    return () => {
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      bgMusicRef.current = null;
    };
  }, [getNextRandomIndex, playTrack]);

  const toggleMusic = useCallback(() => {
    const audio = bgMusicRef.current;
    if (!audio) return;

    if (musicMuted || audio.paused) {
      audio.muted = false;
      isMutedRef.current = false;
      sounds.enabled = true;
      setMusicMuted(false);
      audio.play().catch((err) => {
        console.error("Error playing background music:", err);
      });
    } else {
      audio.muted = true;
      isMutedRef.current = true;
      audio.pause();
      sounds.enabled = false;
      setMusicMuted(true);
    }
  }, [musicMuted]);

  return {
    playlist: PLAYLIST,
    currentTrack: PLAYLIST[currentTrackIndex] || PLAYLIST[0],
    currentTrackIndex,
    volume,
    setVolume,
    musicMuted,
    musicPlaying,
    toggleMusic,
    nextTrack,
    prevTrack,
    playTrack,
  };
}
