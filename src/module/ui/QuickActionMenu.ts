import { SYSTEM_ID } from "../constants/system.constants.js";
import { TEMPLATE_PATHS } from "../constants/paths.constants.js";
import { QuickActionMenuBuilder } from "./QuickActionMenuBuilder.js";
import { InventoryService } from "../inventory/InventoryService.js";
import { Logger } from "../utils/Logger.js";

/**
 * Schwebendes Menü mit Schnellzugriff auf Waffen / Zauber / Consumables / Abilities
 * des aktuell kontrollierten Actors. Wird automatisch beim Combat-Start geöffnet
 * (siehe combatHooks).
 *
 * Reine UI: jede Aktion ruft die GLEICHEN Service-Methoden auf wie das Actor-Sheet
 * (Item.attack / Item.castSpell / Item.useAbility / InventoryService.consumeOne).
 */
export class QuickActionMenu extends Application {
  private static instance: QuickActionMenu | null = null;
  private static hooksRegistered = false;
  private boundActor: any | null = null;

  static override get defaultOptions(): Record<string, unknown> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "loa-quick-action-menu",
      title: "Schnellaktionen",
      template: TEMPLATE_PATHS.quickActionMenu,
      classes: [SYSTEM_ID, "loa-quick-action-menu-app"],
      width: 360,
      height: "auto",
      resizable: true,
      popOut: true,
    });
  }

  // ----------------- Singleton-Steuerung -----------------

  static getInstance(): QuickActionMenu {
    if (!QuickActionMenu.instance) {
      QuickActionMenu.instance = new QuickActionMenu();
    }
    QuickActionMenu.ensureLiveHooks();
    return QuickActionMenu.instance;
  }

  /**
   * Registriert globale Hooks für Live-Refresh:
   * - Item Create/Update/Delete auf dem gebundenen Actor
   * - Actor-Update (z.B. Resource-Changes)
   * Idempotent: läuft genau einmal.
   */
  private static ensureLiveHooks(): void {
    if (QuickActionMenu.hooksRegistered) return;
    QuickActionMenu.hooksRegistered = true;

    const refresh = (parentActorId: string | null | undefined): void => {
      const inst = QuickActionMenu.instance;
      if (!inst?.rendered) return;
      if (!parentActorId) return;
      if (inst.boundActor?.id !== parentActorId) return;
      inst.render();
    };

    Hooks.on("createItem", (item: any) => refresh(item?.parent?.id));
    Hooks.on("updateItem", (item: any) => refresh(item?.parent?.id));
    Hooks.on("deleteItem", (item: any) => refresh(item?.parent?.id));
    Hooks.on("updateActor", (actor: any) => refresh(actor?.id));
  }

  static openFor(actor: any | null | undefined): void {
    const menu = QuickActionMenu.getInstance();
    menu.setActor(actor ?? null);
    if (!actor) {
      Logger.debug(
        "QuickActionMenu.openFor: kein Actor aufgelöst — Menü öffnet im Leer-Zustand",
      );
    }
    menu.render(true);
  }

  /** Toggles das Menü an/aus — gut für Hotkeys oder Macros. */
  static toggle(): void {
    const inst = QuickActionMenu.instance;
    if (inst?.rendered) {
      void inst.close();
      return;
    }
    QuickActionMenu.openFor(QuickActionMenu.resolveActor());
  }

  static rebind(actor: any | null | undefined): void {
    const inst = QuickActionMenu.instance;
    if (!inst || !inst.rendered) return;
    inst.setActor(actor ?? null);
  }

  static closeIfOpen(): void {
    const inst = QuickActionMenu.instance;
    if (inst?.rendered) void inst.close();
  }

  // ----------------- Actor-Bindung -----------------

  setActor(actor: any | null): void {
    this.boundActor = actor;
    if (this.rendered) this.render();
  }

  /**
   * Bestimmt den Actor, dem das Menü gehört.
   * Reihenfolge:
   *   1. kontrolliertes Token
   *   2. assigned Character (`game.user.character`)
   *   3. eigener Combatant im aktiven Kampf
   *   4. erstes vom User besessenes Token in der aktuellen Szene
   *   5. aktiver Combatant (Fallback für GM)
   */
  static resolveActor(): any | null {
    if (typeof game === "undefined") return null;
    const user = game.user;

    const controlled = canvas?.tokens?.controlled ?? [];
    if (Array.isArray(controlled) && controlled.length > 0 && controlled[0]?.actor) {
      return controlled[0].actor;
    }

    if (user?.character) return user.character;

    const combat = game.combat;
    if (combat?.combatants) {
      const combatants: any[] =
        combat.combatants.contents ?? Array.from(combat.combatants as Iterable<any>);
      const ownCombatant = combatants.find((c) =>
        c?.actor?.testUserPermission?.(user, "OWNER"),
      );
      if (ownCombatant?.actor) return ownCombatant.actor;
    }

    const tokens: any[] = canvas?.tokens?.placeables ?? [];
    const ownToken = tokens.find((t) =>
      t?.actor?.testUserPermission?.(user, "OWNER"),
    );
    if (ownToken?.actor) return ownToken.actor;

    if (combat?.combatant?.actor) return combat.combatant.actor;
    return null;
  }

  // ----------------- Foundry App -----------------

  override getData(): Record<string, unknown> {
    return QuickActionMenuBuilder.build(this.boundActor) as unknown as Record<string, unknown>;
  }

  override activateListeners(html: JQuery | HTMLElement): void {
    super.activateListeners(html);
    const root: HTMLElement | null =
      (html as { get?: (i: number) => HTMLElement }).get?.(0) ??
      (html as HTMLElement) ??
      null;
    if (!root) return;

    root.querySelectorAll<HTMLElement>("[data-loa-action]").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        const action = btn.dataset.loaAction;
        const itemId = btn.dataset.itemId;
        if (!action || !itemId) return;
        const actor = this.boundActor;
        if (!actor) return;
        const item = actor.items?.get?.(itemId);
        if (!item) return;

        try {
          switch (action) {
            case "attack-weapon":
              await item.attack?.();
              return;
            case "cast-spell":
              await item.castSpell?.();
              return;
            case "use-ability":
              await item.useAbility?.();
              return;
            case "use-consumable":
              await InventoryService.consumeOne(actor, item);
              return;
            default:
              Logger.debug("Quick menu: unknown action", { action });
          }
        } finally {
          // Re-render damit z.B. Consumable-Mengen sich aktualisieren
          if (this.rendered) this.render();
        }
      });
    });
  }
}
