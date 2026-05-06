/**
 * Erzeugt deterministische Roll-Formeln. Reine String-Logik, damit testbar.
 */
export class RollFormulaBuilder {
  static d20WithModifier(modifier: number, bonus: number = 0): string {
    return RollFormulaBuilder.signed("1d20", modifier + bonus);
  }

  static damage(base: string, modifier: number = 0): string {
    return RollFormulaBuilder.signed(base, modifier);
  }

  static signed(base: string, value: number): string {
    if (value === 0) return base;
    const sign = value > 0 ? "+" : "-";
    return `${base} ${sign} ${Math.abs(value)}`;
  }
}
