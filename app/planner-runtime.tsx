"use client";

import { useEffect, useRef } from "react";
import assets from "./assets.generated.json";

function loadScript(src: string, modes?: DOMStringMap) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    if (modes) {
      for (const key of [
        "numerology",
        "chineseZodiac",
        "cosmicScore",
        "guidance",
        "plannerTime",
      ]) {
        if (modes[key]) script.dataset[key] = modes[key];
      }
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Planner asset unavailable"));
    document.body.appendChild(script);
  });
}

export function PlannerRuntime() {
  const started = useRef(false);
  const marker = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started.current || !marker.current) return;
    started.current = true;
    const modes = marker.current.dataset;

    async function start() {
      // The app also supports a missing typed bundle through its tested fallback.
      await loadScript(assets.runtime, modes).catch(() => {});
      await loadScript(assets.planner);
      if (status.current) status.current.hidden = true;
      if (
        process.env.NODE_ENV === "production" &&
        "serviceWorker" in navigator
      ) {
        void navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }
    void start().catch(() => {
      if (status.current)
        status.current.textContent =
          "Cosmic Planner could not open. Reconnect and reload this page.";
    });
  }, []);

  return (
    <>
      <div
        hidden
        ref={marker}
        id="plannerAssets"
        suppressHydrationWarning
        data-sdk={assets.sdk}
        data-numerology="typed"
        data-chinese-zodiac="typed"
        data-cosmic-score="typed"
        data-guidance="typed"
        data-planner-time="typed"
      />
      <div className="shell-loading" ref={status} role="status">
        Opening Cosmic Planner…
      </div>
      <noscript>Enable JavaScript to open Cosmic Planner.</noscript>
    </>
  );
}
