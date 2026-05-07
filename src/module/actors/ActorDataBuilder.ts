import type { AttributeKey } from "../constants/system.constants.js";
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from "../constants/system.constants.js";
import type { LoAActorSystemData, LoAAttribute } from "../types/actor.types.js";
import { PointBuyService } from "../attributes/PointBuyService.js";
import { ResourceManager } from "../resources/ResourceManager.js";
import { ResonanceManager } from "../magic/ResonanceManager.js";
import { InventoryService } from "../inventory/InventoryService.js";

interface AttributeViewModel {
  key: AttributeKey;
  label: string;
  value: number;
  modifier: number;
  modifierLabel: string;
  costAtLevel: number;
}

interface ResourceViewModel {
  key: string;
  label: string;
  value: number;
  max: number;
  ratioPercent: number;
}

interface InventoryItemVM {
  id: string;
  name: string;
  img: string;
  type: string;
  slots: number;
  description: string;
  quantity: number;
  hasStack: boolean;
}

interface SpellVM extends InventoryItemVM {
  level: number;
  isCantrip: boolean;
  resonanceCost: number;
  damage: string;
  attribute: AttributeKey;
}

interface WeaponVM extends InventoryItemVM {
  damage: string;
  damageType: string;
  attackBonus: number;
  attribute: AttributeKey;
  range: string;
}

interface AbilityVM extends InventoryItemVM {
  effectKind: "damage" | "heal" | "utility" | "reaction";
  effectKindLabel: string;
  actionCost: "action" | "bonus" | "reaction" | "free";
  actionCostLabel: string;
  isReaction: boolean;
  damage: string;
  damageType: string;
  healFormula: string;
  reactionMode: string;
  reactionFormula: string;
  reactionSummary: string;
}

interface ArmorVM extends InventoryItemVM {
  acBonus: number;
  armorType: string;
  equipped: boolean;
}

export interface ActorSheetViewModel {
  attributes: AttributeViewModel[];
  resources: ResourceViewModel[];
  pointBuy: { spent: number; remaining: number; total: number };
  resonance: ReturnType<typeof ResonanceManager.evaluate>;
  ac: { bonus: number; value: number; dex: number; armor: number };
  actionEconomy: {
    actions: { value: number; max: number };
    bonusActions: { value: number; max: number };
    reactions: { value: number; max: number };
  };
  inventory: {
    capacity: number;
    used: number;
    free: number;
    slots: Array<{ index: number; item: InventoryItemVM | null }>;
  };
  equippedArmor: ArmorVM | null;
  spellbook: SpellVM[];
  weapons: WeaponVM[];
  abilities: AbilityVM[];
}

const RESOURCE_LABELS: Record<string, string> = {
  hp: "Lebenspunkte",
  resonance: "Resonanz",
};

interface ActorLike {
  system: LoAActorSystemData;
  items: { contents: any[] };
}

/**
 * Bereitet Actor-Daten für das Sheet auf. Sheets bleiben so frei von Berechnungs-
 * und Mapping-Logik.
 */
export class ActorDataBuilder {
  static build(actor: ActorLike): ActorSheetViewModel {
    const system = actor.system;

    const attributes = ATTRIBUTE_KEYS.map((key): AttributeViewModel => {
      const attr: LoAAttribute = system.attributes?.[key] ?? { value: 10, modifier: 0 };
      const modifier = attr.modifier;
      return {
        key,
        label: ATTRIBUTE_LABELS[key],
        value: attr.value,
        modifier,
        modifierLabel: modifier >= 0 ? `+${modifier}` : `${modifier}`,
        costAtLevel: PointBuyService.costForValue(attr.value),
      };
    });

    const resources: ResourceViewModel[] = Object.entries(system.resources ?? {}).map(
      ([key, value]) => ({
        key,
        label: RESOURCE_LABELS[key] ?? key,
        value: value.value,
        max: value.max,
        ratioPercent: Math.round(ResourceManager.ratio(value) * 100),
      }),
    );

    const budget = system.pointBuy?.total ?? 27;
    const spent = PointBuyService.totalSpent(system.attributes ?? ({} as Record<AttributeKey, LoAAttribute>));
    const resonanceValue = system.resources?.resonance?.value ?? 0;

    const allItems = (actor.items?.contents ?? []) as any[];
    const inventory = ActorDataBuilder.buildInventory(actor, allItems);
    const equippedArmor = ActorDataBuilder.findEquippedArmor(allItems);
    const spellbook = ActorDataBuilder.buildSpellbook(allItems);
    const weapons = ActorDataBuilder.buildWeapons(allItems);
    const abilities = ActorDataBuilder.buildAbilities(allItems);

    return {
      attributes,
      resources,
      pointBuy: {
        total: budget,
        spent,
        remaining: budget - spent,
      },
      resonance: ResonanceManager.evaluate(resonanceValue),
      ac: {
        bonus: system.ac?.bonus ?? 0,
        value: system.ac?.value ?? 0,
        dex: system.attributes?.dex?.modifier ?? 0,
        armor: ActorDataBuilder.sumEquippedArmor(allItems),
      },
      actionEconomy: {
        actions: system.actionEconomy?.actions ?? { value: 1, max: 1 },
        bonusActions: system.actionEconomy?.bonusActions ?? { value: 1, max: 1 },
        reactions: system.actionEconomy?.reactions ?? { value: 1, max: 1 },
      },
      inventory,
      equippedArmor,
      spellbook,
      weapons,
      abilities,
    };
  }

  private static buildInventory(actor: ActorLike, items: any[]): ActorSheetViewModel["inventory"] {
    const capacity = InventoryService.capacity(actor);
    const backpack = items.filter((it) => InventoryService.countsTowardsBackpack(it));
    const used = backpack.reduce((sum, it) => sum + InventoryService.slotCost(it), 0);

    // Items nach Slot-Belegung in Slots auflösen — ein Item, das 2 Slots belegt,
    // bekommt einen Hauptslot und einen Folge-Slot.
    const slots: Array<{ index: number; item: InventoryItemVM | null }> = [];
    let cursor = 0;
    for (const item of backpack) {
      const cost = InventoryService.slotCost(item);
      const vm = ActorDataBuilder.toItemVM(item);
      slots.push({ index: cursor, item: vm });
      cursor += 1;
      for (let i = 1; i < cost && cursor < capacity; i += 1) {
        slots.push({ index: cursor, item: null });
        cursor += 1;
      }
      if (cursor >= capacity) break;
    }
    while (slots.length < capacity) {
      slots.push({ index: slots.length, item: null });
    }

    return { capacity, used, free: Math.max(0, capacity - used), slots };
  }

  private static sumEquippedArmor(items: any[]): number {
    return items
      .filter((it) => it.type === "armor" && it.system?.equipped)
      .reduce((sum, it) => sum + Number(it.system?.acBonus ?? 0), 0);
  }

  private static findEquippedArmor(items: any[]): ArmorVM | null {
    const armor = items.find((it) => it.type === "armor" && it.system?.equipped);
    if (!armor) return null;
    return {
      ...ActorDataBuilder.toItemVM(armor),
      acBonus: Number(armor.system?.acBonus ?? 0),
      armorType: String(armor.system?.armorType ?? "light"),
      equipped: true,
    };
  }

  private static buildSpellbook(items: any[]): SpellVM[] {
    return items
      .filter((it) => it.type === "spell")
      .map((spell) => ({
        ...ActorDataBuilder.toItemVM(spell),
        level: Number(spell.system?.level ?? 0),
        isCantrip: Boolean(spell.system?.isCantrip),
        resonanceCost: Number(spell.system?.resonanceCost ?? 0),
        damage: String(spell.system?.damage ?? ""),
        attribute: (spell.system?.attribute ?? "int") as AttributeKey,
      }));
  }

  private static buildAbilities(items: any[]): AbilityVM[] {
    const kindLabels: Record<string, string> = {
      damage: "Schaden",
      heal: "Heilung",
      utility: "Utility",
      reaction: "Reaktion",
    };
    const costLabels: Record<string, string> = {
      action: "Aktion",
      bonus: "Bonus",
      reaction: "Reaktion",
      free: "Kostenlos",
    };
    const modeLabels: Record<string, string> = {
      flat: "Block",
      rolled: "Wurf vs DC",
      counter: "Gegenzauber",
    };
    return items
      .filter((it) => it.type === "ability")
      .map((ability) => {
        const sys = ability.system ?? {};
        const effectKind = (sys.effectKind ?? "utility") as AbilityVM["effectKind"];
        const actionCost = (sys.actionCost ?? "action") as AbilityVM["actionCost"];
        const reactionMode = String(sys.reactionMode ?? "flat");
        const reactionFormula = String(sys.reactionFormula ?? "0");
        const reactionAttribute = String(sys.reactionAttribute ?? "int");
        const isReaction = effectKind === "reaction" || actionCost === "reaction";

        let reactionSummary = "";
        if (effectKind === "reaction") {
          if (reactionMode === "flat") {
            reactionSummary = `Block ${reactionFormula}`;
          } else if (reactionMode === "counter") {
            reactionSummary = `Gegenzauber (${reactionAttribute})`;
          } else {
            reactionSummary = `Wurf ${reactionAttribute} → ${reactionFormula}`;
          }
        }

        return {
          ...ActorDataBuilder.toItemVM(ability),
          effectKind,
          effectKindLabel: kindLabels[effectKind] ?? effectKind,
          actionCost,
          actionCostLabel: costLabels[actionCost] ?? actionCost,
          isReaction,
          damage: String(sys.damage ?? ""),
          damageType: String(sys.damageType ?? "physical"),
          healFormula: String(sys.healFormula ?? ""),
          reactionMode,
          reactionFormula,
          reactionSummary: reactionSummary || (isReaction ? modeLabels[reactionMode] ?? "" : ""),
        };
      });
  }

  private static buildWeapons(items: any[]): WeaponVM[] {
    return items
      .filter((it) => it.type === "weapon")
      .map((weapon) => ({
        ...ActorDataBuilder.toItemVM(weapon),
        damage: String(weapon.system?.damage ?? "1d4"),
        damageType: String(weapon.system?.damageType ?? "physical"),
        attackBonus: Number(weapon.system?.attackBonus ?? 0),
        attribute: (weapon.system?.attribute ?? "str") as AttributeKey,
        range: String(weapon.system?.range ?? "melee"),
      }));
  }

  private static toItemVM(item: any): InventoryItemVM {
    const quantity = Math.max(1, Number(item.system?.quantity ?? 1));
    return {
      id: String(item.id ?? ""),
      name: String(item.name ?? "Item"),
      img: String(item.img ?? "icons/svg/item-bag.svg"),
      type: String(item.type ?? ""),
      slots: InventoryService.slotCost(item),
      description: String(item.system?.description ?? ""),
      quantity,
      hasStack: quantity > 1,
    };
  }
}
