/**
 * Liest die aktuell vom User getargeteten Tokens / Actors.
 * Andere Services greifen NICHT direkt auf game.user.targets zu.
 */
export class TargetService {
  static getTokens(): any[] {
    if (typeof game === "undefined") return [];
    const targets = game.user?.targets;
    if (!targets) return [];
    return Array.from(targets);
  }

  static getActors(): any[] {
    return TargetService.getTokens()
      .map((token) => token?.actor)
      .filter((actor) => Boolean(actor));
  }

  static hasTargets(): boolean {
    return TargetService.getTokens().length > 0;
  }
}
