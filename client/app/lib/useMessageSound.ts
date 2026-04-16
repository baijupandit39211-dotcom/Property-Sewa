"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MessageSoundCandidate = {
  _id: string;
  senderRole?: "seller" | "buyer";
};

type UseMessageSoundOptions = {
  storageKey?: string;
  src?: string;
  maxTrackedIds?: number;
};

const DEFAULT_STORAGE_KEY = "property-sewa:chat-sound-muted";
const DEFAULT_SOUND_SRC = "/sounds/message.mp3?v=20260416-notify";
const DEFAULT_MAX_TRACKED_IDS = 200;

function readInitialMutedState(storageKey: string) {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

export function useMessageSound(options: UseMessageSoundOptions = {}) {
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  const src = options.src || DEFAULT_SOUND_SRC;
  const maxTrackedIds = options.maxTrackedIds || DEFAULT_MAX_TRACKED_IDS;

  const [isMuted, setIsMuted] = useState(() => readInitialMutedState(storageKey));
  const [isPlaybackBlocked, setIsPlaybackBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackedMessageIdsRef = useRef<string[]>([]);
  const trackedMessageIdSetRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(storageKey, String(isMuted));
    } catch {}
  }, [isMuted, storageKey]);

  useEffect(() => {
    if (!isPlaybackBlocked || typeof window === "undefined") return;

    const clearBlockedState = () => setIsPlaybackBlocked(false);

    window.addEventListener("pointerdown", clearBlockedState, { once: true });
    window.addEventListener("keydown", clearBlockedState, { once: true });

    return () => {
      window.removeEventListener("pointerdown", clearBlockedState);
      window.removeEventListener("keydown", clearBlockedState);
    };
  }, [isPlaybackBlocked]);

  const controls = useMemo(
    () => ({
      mute: () => setIsMuted(true),
      unmute: () => setIsMuted(false),
      toggleMute: () => setIsMuted((prev) => !prev),
    }),
    []
  );

  const trackMessageId = (messageId: string) => {
    if (!messageId || trackedMessageIdSetRef.current.has(messageId)) return;

    trackedMessageIdSetRef.current.add(messageId);
    trackedMessageIdsRef.current.push(messageId);

    if (trackedMessageIdsRef.current.length <= maxTrackedIds) return;

    const removedId = trackedMessageIdsRef.current.shift();
    if (removedId) {
      trackedMessageIdSetRef.current.delete(removedId);
    }
  };

  const playIncomingMessageSound = async (
    message: MessageSoundCandidate | null | undefined,
    incomingSenderRole: "seller" | "buyer"
  ) => {
    if (!message?._id || message.senderRole !== incomingSenderRole) return false;
    if (isMuted || trackedMessageIdSetRef.current.has(message._id)) return false;

    const audio = audioRef.current;
    if (!audio) return false;
    trackMessageId(message._id);

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
      setIsPlaybackBlocked(false);
      return true;
    } catch (error) {
      const playbackError = error as DOMException | undefined;
      if (playbackError?.name === "NotAllowedError") {
        setIsPlaybackBlocked(true);
        return false;
      }

      return false;
    }
  };

  return {
    isMuted,
    isPlaybackBlocked,
    mute: controls.mute,
    unmute: controls.unmute,
    toggleMute: controls.toggleMute,
    playIncomingMessageSound,
  };
}
