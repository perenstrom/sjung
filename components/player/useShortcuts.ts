"use client";

import { useEffect, useEffectEvent, useState } from "react";

import type { Player, PlayerSnapshot } from "@/lib/player/player";
import { runShortcutAction, shortcutFor } from "@/lib/player/shortcuts";

const HUD_MILLISECONDS = 1600;

/** Elements whose keys are their own: typing in a field, or choosing in a list. */
const OWN_KEYS = "textarea, select, input:not([type=range]), [contenteditable]:not([contenteditable=false])";

/**
 * The player's keyboard shortcuts (`shortcutFor`), and the short message
 * (HUD) saying what a key just did. `layerOpen` is whether one of the
 * player's popovers is open; the shortcuts list counts too.
 */
export function useShortcuts({
  player,
  snapshot,
  layerOpen,
}: {
  player: Player | null;
  snapshot: PlayerSnapshot;
  layerOpen: boolean;
}) {
  const [hud, setHud] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const onKeyDown = useEffectEvent((event: KeyboardEvent): string | null => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest(OWN_KEYS)) return null;
    const sliderFocused = target instanceof HTMLInputElement && target.type === "range";
    const shortcut = shortcutFor(event, { snapshot, layerOpen: layerOpen || helpOpen, sliderFocused });
    if (!shortcut) return null;
    // The shortcuts list covers the player, so only ? (to close it) acts there.
    if (helpOpen && shortcut.action?.type !== "help") return null;

    const { action } = shortcut;
    if (action?.type === "help") {
      event.preventDefault();
      setHelpOpen((open) => !open);
      return null;
    }
    // Until the file has loaded there is nothing for a key to do.
    if (!player) return null;
    event.preventDefault();
    if (action) runShortcutAction(player, action);
    return shortcut.hud;
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
