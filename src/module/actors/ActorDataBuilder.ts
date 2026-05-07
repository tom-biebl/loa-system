import type { AttributeKey } from "../constants/system.constants.js";
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from "../constants/system.constants.js";
import type {
  LoAActorSystemData,
  LoAAttribute,
  LoAResource,
  SuperiorityDiceResource,
  AmmoResource,
  SpecialAmmoEntry,
  PotionInventory,
} from "../types/actor.types.js";
import { PointBuyService } from "../attributes/PointBuyService.js";
import { ResourceManager } from "../resources/ResourceManager.js";
import { ResonanceManager } from "../magic/ResonanceManager.js";
import { InventoryService } from "../inventory/InventoryService.js";
import { ClassManager } from "../classes/ClassManager.js";
import {
  CLASS_DEFINITIONS,
  NULL_CLASS_LABEL,
  type ClassResourceKey,
  type SubclassDefinition,
} from "../constants/class.constants.js";
import { ExperienceService, type ExperienceComputed } from "../experience/ExperienceService.js";

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

interface ArmorVM extends InventoryItemVM {
  acBonus: number;
  armorType: string;
  equipped: boolean;
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

interface ClassOptionVM {
  key: string;
  label: string;
}

interface ClassViewModel {
  key: string;
  label: string;
  subclassKey: string | null;
  subclassLabel: string | null;
  options: ClassOptionVM[];
  subclasses: ClassOptionVM[];
  hasSubclasses: boolean;
}

interface ClassResourcesViewModel {
  any: boolean;
  showResonance: boolean;
  showSuperiorityDice: boolean;
  superiorityDice: SuperiorityDiceResource;
  showPotions: boolean;
  potions: PotionInventory;
  potionSlotIndices: number[];
  showAmmo: boolean;
  ammo: AmmoResource;
  showSpecialAmmo: boolean;
  specialAmmo: SpecialAmmoEntry[];
}

interface ExperienceGroupVM {
  category: string;
  entries: ExperienceComputed[];
}

interface ExperienceAddOptionGroup {
  category: string;
  areas: Array<{ key: string; label: string }>;
}

interface ExperienceViewModel {
  groups: ExperienceGroupVM[];
  totalCount: number;
  available: ExperienceAddOptionGroup[];
  hasAvailable: boolean;
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
  class: ClassViewModel;
  classResources: ClassResourcesViewModel;
  experience: ExperienceViewModel;
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
      const attr: LoAAttribute = system.attributes?.[key] ?? { value: 8, modifier: 0 };
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

    const classView = ActorDataBuilder.buildClass(system);
    const enabledResources = ClassManager.getEnabledResources(
      classView.key,
      classView.subclassKey,
    );

    const resources: ResourceViewModel[] = [];
    if (system.resources?.hp) {
      resources.push(ActorDataBuilder.toResourceVM("hp", system.resources.hp as LoAResource));
    }
    if (enabledResources.has("resonance") && system.resources?.resonance) {
      resources.push(
        ActorDataBuilder.toResourceVM("resonance", system.resources.resonance as LoAResource),
      );
    }

    const budget = system.pointBuy?.total ?? 27;
    const spent = PointBuyService.totalSpent(
      system.attributes ?? ({} as Record<AttributeKey, LoAAttribute>),
    );
    const resonanceValue = system.resources?.resonance?.value ?? 0;

    const allItems = (actor.items?.contents ?? []) as any[];
    const inventory = ActorDataBuilder.buildInventory(actor, allItems);
    const equippedArmor = ActorDataBuilder.findEquippedArmor(allItems);
    const spellbook = ActorDataBuilder.buildSpellbook(allItems);
    const weapons = ActorDataBuilder.buildWeapons(allItems);
    const abilities = ActorDataBuilder.buildAbilities(allItems);

    const classResources = ActorDataBuilder.buildClassResources(system, enabledResources);
    const experience = ActorDataBuilder.buildExperience(system);

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
      class: classView,
      classResources,
      experience,
    };
  }

  // ----------------- Class -----------------

  private static buildClass(system: LoAActorSystemData): ClassViewModel {
    const key = system.class?.key ?? "none";
    const subclassKey = system.class?.subclass ?? null;
    const def = ClassManager.getDefinition(key);
    const subDef = ClassManager.getSubclass(key, subclassKey);

    const options: ClassOptionVM[] = [
      { key: "none", label: NULL_CLASS_LABEL },
      ...CLASS_DEFINITIONS.map((c) => ({ key: c.key, label: c.label })),
    ];
    const subclasses = (def?.subclasses ?? []).map((s: SubclassDefinition) => ({
      key: s.key,
      label: s.label,
    }));

    return {
      key,
      label: def?.label ?? NULL_CLASS_LABEL,
      subclassKey,
      subclassLabel: subDef?.label ?? null,
      options,
      subclasses,
      hasSubclasses: subclasses.length > 0,
    };
  }

  // ----------------- Class Resources -----------------

  private static buildClassResources(
    system: LoAActorSystemData,
    enabled: Set<ClassResourceKey>,
  ): ClassResourcesViewModel {
    const showResonance = enabled.has("resonance");
    const showSuperiorityDice = enabled.has("superiorityDice");
    const showPotions = enabled.has("potions");
    const showAmmo = enabled.has("ammo");
    const showSpecialAmmo = enabled.has("specialAmmo");

    const potions =
      (system.classResources?.potions as PotionInventory) ?? { slots: 6, items: [] };
    const potionSlotIndices = Array.from(
      { length: Math.max(0, Number(potions.slots ?? 0)) },
      (_, i) => i,
    );

    return {
      any:
        showResonance ||
        showSuperiorityDice ||
        showPotions ||
        showAmmo ||
        showSpecialAmmo,
      showResonance,
      showSuperiorityDice,
      superiorityDice:
        (system.resources?.superiorityDice as SuperiorityDiceResource) ?? {
          dice: "1d6",
          current: 0,
          max: 0,
        },
      showPotions,
      potions,
      potionSlotIndices,
      showAmmo,
      ammo:
        (system.resources?.ammo as AmmoResource) ?? { arrows: 0, bolts: 0 },
      showSpecialAmmo,
      specialAmmo: Array.isArray(system.resources?.specialAmmo)
        ? (system.resources?.specialAmmo as SpecialAmmoEntry[])
        : [],
    };
  }

  // ----------------- Experience -----------------

  private static buildExperience(system: LoAActorSystemData): ExperienceViewModel {
    const computed = ExperienceService.computeAll(system.experience);
    const grouped = new Map<string, ExperienceComputed[]>();
    for (const entry of computed) {
      const cat = entry.area?.category ?? "Sonstiges";
      const list = grouped.get(cat) ?? [];
      list.push(entry);
      grouped.set(cat, list);
    }
    const groups: ExperienceGroupVM[] = Array.from(grouped.entries()).map(
      ([category, entries]) => ({ category, entries }),
    );

    const ownedKeys = computed.map((e) => e.key);
    const available = ExperienceService.getAvailableByCategory(ownedKeys).map(
      (group) => ({
        category: group.category,
        areas: group.areas.map((a) => ({ key: a.key, label: a.label })),
      }),
    );

    return {
      groups,
      totalCount: computed.length,
      available,
      hasAvailable: available.length > 0,
    };
  }

  // ----------------- Inventory / Items -----------------

  private static toResourceVM(key: string, value: LoAResource): ResourceViewModel {
    return {
      key,
      label: RESOURCE_LABELS[key] ?? key,
      value: value.value,
      max: value.max,
      ratioPercent: Math.round(ResourceManager.ratio(value) * 100),
    };
  }

  private static buildInventory(actor: ActorLike, items: any[]): ActorSheetViewModel["inventory"] {
    const capacity = InventoryService.capacity(actor);
    const backpack = items.filter((it) => InventoryService.countsTowardsBackpack(it));
    const used = backpack.reduce((sum, it) => sum + InventoryService.slotCost(it), 0);

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
