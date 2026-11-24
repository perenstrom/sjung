"use client";

import { useEffect, useEffectEvent, useState } from "react";

import type { PlayerControls, PlayerControlsView } from "@/lib/player/player-controls";
import { commandFor } from "@/lib/player/shortcuts";

const HUD_MILLISECONDS = 1600;

/** Elements whose keys are their own: typing in a field, or choosing in a list. */
const OWN_KEYS = "textarea, select, input:not([type=range]), [contenteditable]:not([contenteditable=false])";

/**
 * The player's keyboard shortcuts (`commandFor`), and the short message
 * (HUD) saying what a key just did. `controls` is `null` until the file has
 * loaded. `layerOpen` is whether one of the player's popovers is open; the
 * shortcuts list counts too.
 */
export function useShortcuts({
  controls,
  view,
  layerOpen,
}: {
  controls: PlayerControls | null;
  view: PlayerControlsView;
  layerOpen: boolean;
}) {
  const [hud, setHud] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const onKeyDown = useEffectEvent((event: KeyboardEvent): string | null => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest(OWN_KEYS)) return null;
    const sliderFocused = target instanceof HTMLInputElement && target.type === "range";
    const command = commandFor(event, { view, layerOpen: layerOpen || helpOpen, sliderFocused });
    if (!command) return null;
    // The shortcuts list covers the player, so only ? (to close it) acts there.
    if (helpOpen && command.type !== "help") return null;

    if (command.type === "help") {
      event.preventDefault();
      setHelpOpen((open) => !open);
      return null;
    }
    // Until the file has loaded there is nothing for a key to do.
    if (!controls) return null;
    event.preventDefault();
    return controls.run(command);
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function handleKeyDown(event: KeyboardEvent) {
      const message = onKeyDown(event);
      if (message === null) return;
      setHud(message);
      clearTimeout(timer);
      timer = setTimeout(() => setHud(null), HUD_MILLISECONDS);
    }
    // A focused button would also "click" when the space bar comes up.
    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === " " && event.target instanceof HTMLElement && event.target.closest("button")) {
        event.preventDefault();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      clearTimeout(timer);
    };
  }, []);

  return { hud, helpOpen, setHelpOpen };
}
