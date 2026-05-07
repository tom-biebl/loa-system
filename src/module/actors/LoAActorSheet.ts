import { TEMPLATE_PATHS } from "../constants/paths.constants.js";
import { SYSTEM_ID } from "../constants/system.constants.js";
import type { AttributeKey } from "../constants/system.constants.js";
import { ActorDataBuilder } from "./ActorDataBuilder.js";
import { InventoryService } from "../inventory/InventoryService.js";
import { ClassManager } from "../classes/ClassManager.js";
import { ExperienceService } from "../experience/ExperienceService.js";
import { ActionEconomyService } from "../combat/ActionEconomy.js";
import { RestService } from "./RestService.js";
import { Logger } from "../utils/Logger.js";
import type { LoAActor } from "./LoAActor.js";

type DropZone = "backpack" | "armor" | "spellbook";

/**
 * Sheet-Controller. Koordiniert UI / Inputs, delegiert Mechanik an Services.
 *
 * - Drop-Zonen `backpack` / `armor` / `spellbook` validieren das Item-Type
 * - Backpack-Kapazität wird gegen InventoryService geprüft
 * - Action-Buttons rufen Item.castSpell / Item.attack / Equip-Toggle auf
 */
export class LoAActorSheet extends ActorSheet {
  declare actor: LoAActor;

  static override get defaultOptions(): Record<string, unknown> {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [SYSTEM_ID, "sheet", "actor"],
      template: TEMPLATE_PATHS.actorCharacter,
      width: 960,
      height: 760,
      tabs: [
        {
          navSelector: ".loa-tabs",
          contentSelector: ".loa-content",
          initial: "main",
        },
      ],
      dragDrop: [{ dragSelector: ".loa-draggable", dropSelector: ".loa-dropzone" }],
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
    data.viewModel = ActorDataBuilder.build(this.actor);
    data.items = this.actor.items?.contents ?? [];
    return data;
  }

  override activateListeners(html: JQuery | HTMLElement): void {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const root = LoAActorSheet.unwrap(html);
    if (!root) return;

    this.bindAttributeRolls(root);
    this.bindItemActions(root);
    this.bindBackpackSearch(root);
    this.bindClassChange(root);
    this.bindExperience(root);
    this.bindSpecialAmmo(root);
    this.bindActionEconomy(root);
    this.bindRestActions(root);
  }

  private bindRestActions(root: HTMLElement): void {
    root
      .querySelectorAll<HTMLElement>("[data-loa-action='short-rest']")
      .forEach((btn) => {
        btn.addEventListener("click", async (event) => {
          event.preventDefault();
          await RestService.shortRest(this.actor);
        });
      });

    root
      .querySelectorAll<HTMLElement>("[data-loa-action='long-rest']")
      .forEach((btn) => {
        btn.addEventListener("click", async (event) => {
          event.preventDefault();
          await RestService.longRest(this.actor);
        });
      });
  }

  private bindActionEconomy(root: HTMLElement): void {
    // Reset-Button
    root
      .querySelectorAll<HTMLElement>("[data-loa-action='reset-action-economy']")
      .forEach((btn) => {
        btn.addEventListener("click", async (event) => {
          event.preventDefault();
          await ActionEconomyService.resetActionsForTurn(this.actor);
        });
      });

    // Spend-Button (manueller Verbrauch via "−"-Knopf)
    root
      .querySelectorAll<HTMLElement>("[data-loa-action='spend-action']")
      .forEach((btn) => {
        btn.addEventListener("click", async (event) => {
          event.preventDefault();
          const type = btn.dataset.actionType as
            | "action"
            | "bonusAction"
            | "reaction"
            | undefined;
          if (!type) return;
          await ActionEconomyService.spendAction(this.actor, type, {
            description: "manuell",
            enforce: true,
          });
        });
      });

    // Current/Max-Inputs
    root
      .querySelectorAll<HTMLInputElement>("[data-loa-action='set-action-current']")
      .forEach((input) => {
        input.addEventListener("change", async (event) => {
          const target = event.target as HTMLInputElement;
          const type = target.dataset.actionType as
            | "action"
            | "bonusAction"
            | "reaction"
            | undefined;
          if (!type) return;
          await ActionEconomyService.setCurrent(this.actor, type, Number(target.value));
        });
      });

    root
      .querySelectorAll<HTMLInputElement>("[data-loa-action='set-action-max']")
      .forEach((input) => {
        input.addEventListener("change", async (event) => {
          const target = event.target as HTMLInputElement;
          const type = target.dataset.actionType as
            | "action"
            | "bonusAction"
            | "reaction"
            | undefined;
          if (!type) return;
          await ActionEconomyService.setMax(this.actor, type, Number(target.value));
        });
      });
  }

  /** Beim Klassenwechsel ggf. ungültige Subklasse zurücksetzen. */
  private bindClassChange(root: HTMLElement): void {
    const select = root.querySelector(
      "select[name='system.class.key']",
    ) as HTMLSelectElement | null;
    if (!select) return;
    select.addEventListener("change", async (event) => {
      const newClassKey = (event.target as HTMLSelectElement).value;
      const currentSubclass = this.actor.system.class?.subclass ?? null;
      if (currentSubclass && !ClassManager.isSubclassValid(newClassKey, currentSubclass)) {
        await this.actor.update({
          "system.class.key": newClassKey,
          "system.class.subclass": null,
        });
        return;
      }
      await this.actor.update({ "system.class.key": newClassKey });
    });
  }

  /** Hinzufügen / Entfernen / XP-Edit für Erfahrungsbereiche. */
  private bindExperience(root: HTMLElement): void {
    const addBtn = root.querySelector(
      "[data-loa-action='add-experience']",
    ) as HTMLElement | null;
    if (addBtn) {
      addBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        const select = root.querySelector(
          "[data-loa-experience-pick]",
        ) as HTMLSelectElement | null;
        const key = select?.value;
        if (!key) return;
        const area = ExperienceService.getArea(key);
        const list = Array.isArray(this.actor.system.experience)
          ? [...this.actor.system.experience]
          : [];
        if (list.some((e) => e.key === key)) return;
        list.push({ key, label: area?.label, xp: 0 });
        await this.actor.update({ "system.experience": list });
      });
    }

    root.querySelectorAll<HTMLElement>("[data-loa-action='remove-experience']").forEach((el) => {
      el.addEventListener("click", async (event) => {
        event.preventDefault();
        const key = el.dataset.experienceKey;
        if (!key) return;
        const list = Array.isArray(this.actor.system.experience)
          ? this.actor.system.experience.filter((e) => e.key !== key)
          : [];
        await this.actor.update({ "system.experience": list });
      });
    });

    root.querySelectorAll<HTMLInputElement>("[data-loa-experience-xp]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;
        const key = target.dataset.loaExperienceXp;
        if (!key) return;
        const xp = Math.max(0, Number(target.value) || 0);
        const list = Array.isArray(this.actor.system.experience)
          ? this.actor.system.experience.map((e) =>
              e.key === key ? { ...e, xp } : e,
            )
          : [];
        await this.actor.update({ "system.experience": list });
      });
    });
  }

  /** CRUD für Soul-Hunter Spezialmunition (Array). */
  private bindSpecialAmmo(root: HTMLElement): void {
    const addBtn = root.querySelector(
      "[data-loa-action='add-special-ammo']",
    ) as HTMLElement | null;
    if (addBtn) {
      addBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        const list = Array.isArray(this.actor.system.resources?.specialAmmo)
          ? [...this.actor.system.resources.specialAmmo]
          : [];
        list.push({ type: "", label: "Neue Munition", amount: 0 });
        await this.actor.update({ "system.resources.specialAmmo": list });
      });
    }

    root.querySelectorAll<HTMLElement>("[data-loa-action='remove-special-ammo']").forEach((el) => {
      el.addEventListener("click", async (event) => {
        event.preventDefault();
        const row = el.closest("[data-special-ammo-index]") as HTMLElement | null;
        const idx = Number(row?.dataset.specialAmmoIndex ?? -1);
        if (!Number.isFinite(idx) || idx < 0) return;
        const current = Array.isArray(this.actor.system.resources?.specialAmmo)
          ? [...this.actor.system.resources.specialAmmo]
          : [];
        current.splice(idx, 1);
        await this.actor.update({ "system.resources.specialAmmo": current });
      });
    });

    root.querySelectorAll<HTMLInputElement>("[data-loa-special-ammo-field]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;
        const row = target.closest("[data-special-ammo-index]") as HTMLElement | null;
        const idx = Number(row?.dataset.specialAmmoIndex ?? -1);
        const field = target.dataset.loaSpecialAmmoField;
        if (!Number.isFinite(idx) || idx < 0 || !field) return;
        const list = Array.isArray(this.actor.system.resources?.specialAmmo)
          ? [...this.actor.system.resources.specialAmmo]
          : [];
        const entry = { ...(list[idx] ?? { type: "", label: "", amount: 0 }) };
        if (field === "amount") {
          (entry as any)[field] = Math.max(0, Number(target.value) || 0);
        } else {
          (entry as any)[field] = target.value;
        }
        list[idx] = entry;
        await this.actor.update({ "system.resources.specialAmmo": list });
      });
    });
  }

  /** Volltextsuche über Item-Name/Type/Description im Rucksack. */
  private bindBackpackSearch(root: HTMLElement): void {
    const input = root.querySelector(
      "[data-loa-search='backpack']",
    ) as HTMLInputElement | null;
    if (!input) return;
    const grid = root.querySelector(".loa-backpack-grid") as HTMLElement | null;
    if (!grid) return;

    const apply = (query: string): void => {
      const needle = query.trim().toLowerCase();
      const slots = grid.querySelectorAll<HTMLElement>(".loa-slot");
      slots.forEach((slot) => {
        if (slot.dataset.searchEmpty === "1") {
          slot.style.display = needle ? "none" : "";
          return;
        }
        const haystack = (slot.dataset.searchHaystack ?? "").toLowerCase();
        const match = !needle || haystack.includes(needle);
        slot.style.display = match ? "" : "none";
      });
    };

    input.addEventListener("input", (event) => {
      apply((event.target as HTMLInputElement).value);
    });
  }

  /** Foundry ruft das beim Drop auf eine .loa-dropzone auf. */
  override async _onDrop(event: DragEvent): Promise<unknown> {
    const data = TextEditor.getDragEventData(event) as { type?: string; uuid?: string };
    if (data.type !== "Item") return super._onDrop(event);

    const target = event.target as HTMLElement | null;
    const zoneEl = target?.closest("[data-drop-zone]") as HTMLElement | null;
    const zone = (zoneEl?.dataset.dropZone as DropZone | undefined) ?? "backpack";

    const item = await Item.implementation.fromDropData(data);
    if (!item) return null;

    const isInternal = data.uuid?.includes(this.actor.uuid ?? "::") ?? false;

    if (!LoAActorSheet.validateZoneFit(zone, item.type)) return null;

    if (zone === "backpack" && !isInternal) {
      if (!InventoryService.canAccept(this.actor, item)) {
        ui.notifications?.warn("Der Rucksack ist voll.");
        return null;
      }
    }

    if (zone === "armor") {
      await this.equipArmor(item, isInternal);
      return null;
    }

    if (isInternal) {
      // Spell- oder Backpack-Drop eines bereits eigenen Items: nichts zu tun.
      // Falls Rüstung aus dem Backpack rauszieht: separat per Button (`unequip-armor`).
      return null;
    }

    // Consumables stapeln, wenn ein gleichnamiger Stack noch Platz hat.
    if (zone === "backpack" && item.type === "consumable") {
      const stackResult = await InventoryService.stackConsumable(this.actor, item);
      if (stackResult.handled && stackResult.remainder === 0) {
        return null;
      }
      if (stackResult.remainder > 0) {
        if (!InventoryService.canAccept(this.actor, item)) {
          ui.notifications?.warn("Rucksack ist voll für den Reststapel.");
          return null;
        }
        const data = item.toObject();
        data.system = data.system || {};
        data.system.quantity = stackResult.remainder;
        return this.actor.createEmbeddedDocuments("Item", [data]);
      }
    }

    const itemData = item.toObject();
    if (zone === "spellbook" && item.type === "spell") {
      itemData.system = itemData.system || {};
    }
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  private static validateZoneFit(zone: DropZone, itemType: string): boolean {
    if (zone === "armor" && itemType !== "armor") {
      ui.notifications?.warn("In den Rüstungsslot passt nur Rüstung.");
      return false;
    }
    if (zone === "spellbook" && itemType !== "spell") {
      ui.notifications?.warn("Ins Spellbook passen nur Zauber.");
      return false;
    }
    if (zone === "backpack" && itemType === "spell") {
      ui.notifications?.warn("Zauber gehören ins Spellbook.");
      return false;
    }
    return true;
  }

  private async equipArmor(item: any, isInternal: boolean): Promise<void> {
    const actor = this.actor;
    // Andere getragene Rüstungen ablegen
    const others = (actor.items?.contents ?? []).filter(
      (i: any) => i.type === "armor" && i.system?.equipped && i.id !== item.id,
    );
    for (const other of others) {
      await other.update({ "system.equipped": false });
    }

    if (isInternal) {
      await item.update({ "system.equipped": true });
      return;
    }

    const data = item.toObject();
    data.system = data.system || {};
    data.system.equipped = true;
    await actor.createEmbeddedDocuments("Item", [data]);
  }

  private bindAttributeRolls(root: HTMLElement): void {
    const actor = this.actor;
    root.querySelectorAll("[data-action='roll-attribute']").forEach((el) => {
      const button = el as HTMLElement;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const key = button.dataset.attribute as AttributeKey | undefined;
        if (!key) return;
        void actor.rollAttribute(key);
      });
    });
  }

  private bindItemActions(root: HTMLElement): void {
    const actor = this.actor;
    root.querySelectorAll<HTMLElement>("[data-action]").forEach((el) => {
      const action = el.dataset.action;
      if (!action) return;
      el.addEventListener("click", async (event) => {
        const itemEl = (event.target as HTMLElement | null)?.closest(
          "[data-item-id]",
        ) as HTMLElement | null;
        const itemId = itemEl?.dataset.itemId;
        const item = itemId ? actor.items.get(itemId) : null;

        switch (action) {
          case "open-item":
            event.preventDefault();
            item?.sheet?.render(true);
            return;
          case "delete-item":
            event.preventDefault();
            if (!item) return;
            await item.delete();
            return;
          case "cast-spell":
            event.preventDefault();
            if (!item) return;
            await item.castSpell?.();
            return;
          case "attack-weapon":
            event.preventDefault();
            if (!item) return;
            await item.attack?.();
            return;
          case "use-ability":
            event.preventDefault();
            if (!item) return;
            await item.useAbility?.();
            return;
          case "use-consumable":
            event.preventDefault();
            if (!item) return;
            await InventoryService.consumeOne(actor, item);
            return;
          case "unequip-armor":
            event.preventDefault();
            if (!item) return;
            await item.update({ "system.equipped": false });
            return;
          case "equip-armor":
            event.preventDefault();
            if (!item) return;
            await this.equipArmor(item, true);
            return;
          default:
            Logger.debug("Unhandled sheet action", { action });
        }
      });
    });
  }

  private static unwrap(html: JQuery | HTMLElement): HTMLElement | null {
    return (
      (html as { get?: (i: number) => HTMLElement }).get?.(0) ??
      (html as HTMLElement) ??
      null
    );
  }
}
