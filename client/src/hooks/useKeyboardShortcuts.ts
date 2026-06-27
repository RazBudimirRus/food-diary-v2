import { useEffect } from "react";

interface Shortcut {
  key: string;          // single char, lowercase
  onTrigger: () => void;
  enabled?: boolean;    // default true
}

/**
 * Registers keyboard shortcuts (single-key, no modifier).
 * Skips when focus is inside an input/textarea/select/[contenteditable].
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Skip if user is typing in a form element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) return;

      // Skip if modifier keys held
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const match = shortcuts.find(s => s.key === key && (s.enabled ?? true));
      if (match) {
        e.preventDefault();
        match.onTrigger();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
