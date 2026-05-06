import type { AttributeKey } from "../constants/system.constants.js";
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from "../constants/system.constants.js";
import type { LoAActorSystemData, LoAAttribute } from "../types/actor.types.js";
import { PointBuyService } from "../attributes/PointBuyService.js";
import { ResourceManager } from "../resources/ResourceManager.js";
import { ResonanceManager } from "../magic/ResonanceManager.js";

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
  value: number;
  max: number;
  ratioPercent: number;
}

export interface ActorSheetViewModel {
  attributes: AttributeViewModel[];
  resources: ResourceViewModel[];
  pointBuy: { spent: number; remaining: number; total: number };
  resonance: ReturnType<typeof ResonanceManager.evaluate>;
  actionEconomy: {
    actions: { value: number; max: number };
    bonusActions: { value: number; max: number };
    reactions: { value: number; max: number };
  };
}

/**
 * Bereitet Actor-Daten für das Sheet auf. Sheets bleiben so frei von Berechnungs-
 * und Mapping-Logik.
 */
export class ActorDataBuilder {
  static build(system: LoAActorSystemData): ActorSheetViewModel {
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
        value: value.value,
        max: value.max,
        ratioPercent: Math.round(ResourceManager.ratio(value) * 100),
      }),
    );

    const budget = system.pointBuy?.total ?? 27;
    const spent = PointBuyService.totalSpent(system.attributes ?? ({} as Record<AttributeKey, LoAAttribute>));
    const resonanceValue = system.resources?.resonance?.value ?? 0;

    return {
      attributes,
      resources,
      pointBuy: {
        total: budget,
        spent,
        remaining: budget - spent,
      },
      resonance: ResonanceManager.evaluate(resonanceValue),
      actionEconomy: {
        actions: system.actionEconomy?.actions ?? { value: 1, max: 1 },
        bonusActions: system.actionEconomy?.bonusActions ?? { value: 1, max: 1 },
        reactions: system.actionEconomy?.reactions ?? { value: 1, max: 1 },
      },
    };
  }
}
