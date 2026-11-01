"use client";

import { useEffect } from "react";
import { logoutIdle } from "@/app/(auth)/actions";

const IDLE_MS = 15 * 60 * 1000;

export function IdleLogout() {
  useEffect(() => {
    let timer = setTimeout(() => void logoutIdle(), IDLE_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void logoutIdle(), IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);
  return null;
}
