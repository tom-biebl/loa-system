import {
  ACTION_TYPE_LABELS,
  normalizeActionType,
} from "../constants/action.constants.js";

interface QuickRow {
  id: string;
  name: string;
  img: string;
  actionCostLabel: string;
}

interface WeaponRow extends QuickRow {
  damage: string;
  damageType: string;
  range: string;
}

interface SpellRow extends QuickRow {
  level: number;
  isCantrip: boolean;
  resonanceCost: number;
  effectKindLabel: string;
}

interface ConsumableRow extends QuickRow {
  quantity: number;
  canUse: boolean;
  description: string;
}

interface AbilityRow extends QuickRow {
  effectKindLabel: string;
  isReaction: boolean;
  reactionSummary: string;
}

export interface QuickActionMenuViewModel {
  hasActor: boolean;
  actorId: string | null;
  actorName: string;
  weapons: WeaponRow[];
  spells: SpellRow[];
  consumables: ConsumableRow[];
  abilities: AbilityRow[];
}

const KIND_LABELS: Record<string, string> = {
  damage: "Schaden",
  heal: "Heilung",
  utility: "Utility",
  reaction: "Reaktion",
  reaction_reduce_damage: "Reaktion: Schadensreduktion",
  reaction_counter: "Reaktion: Counter",
  reaction_dodge: "Reaktion: Dodge",
  reaction_custom: "Reaktion: Custom",
};

/**
 * Bereitet die Inhalte des Quick-Action-Menus auf.
 * Liest direkt aus den Actor-Items, keine eigene Kampf-Logik.
 */
export class QuickActionMenuBuilder {
  static build(actor: any | null | undefined): QuickActionMenuViewModel {
    if (!actor) {
      return {
        hasActor: false,
        actorId: null,
        actorName: "",
        weapons: [],
        spells: [],
        consumables: [],
        abilities: [],
      };
    }

    const items = (actor.items?.contents ?? []) as any[];
    return {
      hasActor: true,
      actorId: String(actor.id ?? ""),
      actorName: String(actor.name ?? ""),
      weapons: QuickActionMenuBuilder.buildWeapons(items),
      spells: QuickActionMenuBuilder.buildSpells(items),
      consumables: QuickActionMenuBuilder.buildConsumables(items),
      abilities: QuickActionMenuBuilder.buildAbilities(items),
    };
  }

  private static actionLabel(value: string | null | undefined): string {
    return ACTION_TYPE_LABELS[normalizeActionType(value ?? "action")];
  }

  private static buildWeapons(items: any[]): WeaponRow[] {
    return items
      .filter((it) => it.type === "weapon")
      .map((it) => ({
        id: String(it.id ?? ""),
        name: String(it.name ?? "Waffe"),
        img: String(it.img ?? "icons/svg/sword.svg"),
        damage: String(it.system?.damage ?? "1d4"),
        damageType: String(it.system?.damageType ?? "physical"),
        range: String(it.system?.range ?? "melee"),
        actionCostLabel: QuickActionMenuBuilder.actionLabel(it.system?.actionCost),
      }));
  }

  private static buildSpells(items: any[]): SpellRow[] {
    return items
      .filter((it) => it.type === "spell")
      .map((it) => {
        const sys = it.system ?? {};
        const kind = String(sys.effectKind ?? "damage");
        return {
          id: String(it.id ?? ""),
          name: String(it.name ?? "Zauber"),
          img: String(it.img ?? "icons/svg/aura.svg"),
          level: Number(sys.level ?? 0),
          isCantrip: Boolean(sys.isCantrip),
          resonanceCost: Number(sys.resonanceCost ?? 0),
          effectKindLabel: KIND_LABELS[kind] ?? kind,
          actionCostLabel: QuickActionMenuBuilder.actionLabel(sys.actionCost),
        };
      });
  }

  private static buildConsumables(items: any[]): ConsumableRow[] {
    return items
      .filter((it) => it.type === "consumable")
      .map((it) => {
        const quantity = Math.max(0, Number(it.system?.quantity ?? 1));
        return {
          id: String(it.id ?? ""),
          name: String(it.name ?? "Consumable"),
          img: String(it.img ?? "icons/svg/item-bag.svg"),
          actionCostLabel: QuickActionMenuBuilder.actionLabel(
            it.system?.actionCost ?? "freeAction",
          ),
          quantity,
          canUse: quantity > 0,
          description: String(it.system?.effect ?? it.system?.description ?? ""),
        };
      });
  }

  private static buildAbilities(items: any[]): AbilityRow[] {
    const modeLabels: Record<string, string> = {
      flat: "Block",
      rolled: "Wurf vs DC",
      counter: "Gegenzauber",
    };
    return items
      .filter((it) => it.type === "ability")
      .map((it) => {
        const sys = it.system ?? {};
        const kind = String(sys.effectKind ?? "utility");
        const isReaction =
          kind === "reaction" ||
          kind.startsWith("reaction_") ||
          String(sys.actionCost ?? "") === "reaction";
        const mode = String(sys.reactionMode ?? "flat");
        const formula = String(sys.reactionFormula ?? "0");
        const attribute = String(sys.reactionAttribute ?? "int");
        const rolled = Boolean(sys.reactionRolled);
        let reactionSummary = "";
        if (isReaction) {
          if (kind === "reaction_reduce_damage" || kind === "reaction") {
            reactionSummary = `Block ${formula}`;
          } else if (kind === "reaction_counter") {
            reactionSummary = `Gegenzauber (${attribute})`;
          } else if (kind === "reaction_dodge") {
            reactionSummary = `Dodge (${attribute})`;
          } else if (kind === "reaction_custom") {
            reactionSummary = "Custom";
          } else if (mode === "counter") reactionSummary = `Gegenzauber (${attribute})`;
          else reactionSummary = `Wurf ${attribute} → ${formula}`;
          if (rolled) reactionSummary = `${reactionSummary} · Wurf`;
        }
        return {
          id: String(it.id ?? ""),
          name: String(it.name ?? "Fähigkeit"),
          img: String(it.img ?? "icons/svg/upgrade.svg"),
          actionCostLabel: QuickActionMenuBuilder.actionLabel(sys.actionCost),
          effectKindLabel: KIND_LABELS[kind] ?? kind,
          isReaction,
          reactionSummary: reactionSummary || (isReaction ? modeLabels[mode] ?? "" : ""),
        };
      });
  }
}
