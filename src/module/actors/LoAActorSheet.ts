import { TEMPLATE_PATHS } from "../constants/paths.constants.js";
import { SYSTEM_ID } from "../constants/system.constants.js";
import type { AttributeKey } from "../constants/system.constants.js";
import { ActorDataBuilder } from "./ActorDataBuilder.js";
import type { LoAActor } from "./LoAActor.js";

/**
 * Sheet-Controller. Koordiniert UI-Daten und Aktionen — keine Spielregel-Logik.
 */
export class LoAActorSheet extends ActorSheet {
  declare actor: LoAActor;

  static override get defaultOptions(): Record<string, unknown> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "actor"],
      template: TEMPLATE_PATHS.actorCharacter,
      width: 920,
      height: 720,
      tabs: [
        {
          navSelector: ".loa-tabs",
          contentSelector: ".loa-content",
          initial: "main",
        },
      ],
    });
  }

  override get template(): string {
    if (this.actor.type === "npc") return TEMPLATE_PATHS.actorNpc;
    return TEMPLATE_PATHS.actorCharacter;
  }

  override getData(options: unknown): Record<string, unknown> {
    const data = super.getData(options) as Record<string, unknown>;
    const system = this.actor.system;
    data.system = system;
    data.viewModel = ActorDataBuilder.build(system);
    data.items = this.actor.items?.contents ?? [];
    return data;
  }

  override activateListeners(html: JQuery | HTMLElement): void {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const root: HTMLElement | null =
      (html as { get?: (i: number) => HTMLElement }).get?.(0) ??
      (html as HTMLElement) ??
      null;
    if (!root) return;

    const actor = this.actor;
    const buttons = root.querySelectorAll(
      "[data-action='roll-attribute']",
    ) as NodeListOf<HTMLElement>;
    buttons.forEach((el: HTMLElement) => {
      el.addEventListener("click", (event: Event) => {
        event.preventDefault();
        const key = el.dataset.attribute as AttributeKey | undefined;
        if (!key) return;
        void actor.rollAttribute(key);
      });
    });
  }
}
