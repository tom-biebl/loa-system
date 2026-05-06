import { ReactionService } from "../combat/ReactionService.js";

/**
 * Bindet die Pending-Damage-Buttons in jeder gerenderten ChatMessage.
 * Foundry feuert diesen Hook bei JEDER Message — wir filtern via Flag.
 */
export function registerChatHooks(): void {
  Hooks.on("renderChatMessage", onRenderChatMessage);
}

function onRenderChatMessage(message: any, html: any): void {
  const flags = ReactionService.getFlags(message);
  if (!flags) return;

  const root: HTMLElement | null =
    (html as { get?: (i: number) => HTMLElement }).get?.(0) ??
    (html as HTMLElement) ??
    null;
  if (!root) return;

  const reactBtn = root.querySelector("[data-loa-action='react']") as HTMLElement | null;
  const applyBtn = root.querySelector("[data-loa-action='apply-damage']") as HTMLElement | null;

  reactBtn?.addEventListener("click", (event: Event) => {
    event.preventDefault();
    void ReactionService.openReactionDialog(message);
  });

  applyBtn?.addEventListener("click", (event: Event) => {
    event.preventDefault();
    void ReactionService.applyPending(message);
  });
}
