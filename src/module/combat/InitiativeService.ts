/**
 * Zentralisiert die Initiative-Formel. Andere Module greifen NICHT direkt
 * auf CONFIG.Combat.initiative zu.
 */
export class InitiativeService {
  static readonly FORMULA = "1d20 + @attributes.dex.modifier";

  static configure(): void {
    if (typeof CONFIG === "undefined") return;
    CONFIG.Combat = CONFIG.Combat ?? {};
    CONFIG.Combat.initiative = {
      formula: InitiativeService.FORMULA,
      decimals: 2,
    };
  }
}
