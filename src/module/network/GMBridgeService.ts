import { SYSTEM_ID } from "../constants/system.constants.js";
import { Logger } from "../utils/Logger.js";

const SOCKET_NAME = `system.${SYSTEM_ID}`;

type Handler = (payload: any) => Promise<unknown> | unknown;

interface SocketEnvelope {
  action: string;
  payload: unknown;
}

/**
 * Permission-Bridge zwischen Spieler-Clients und GM.
 *
 * Foundry erlaubt Document-Updates nur durch Owner/GM. Wenn ein Spieler ein
 * fremdes Document updaten muss (z.B. Chat-Message des GM, Heilziel-Actor),
 * emittet er die Aktion via Socket — der GM-Client führt sie aus.
 *
 * Verwendung:
 *   GMBridgeService.run("updateChatMessage", { messageId, update });
 * - Auf GM-Client: Handler läuft direkt (ohne Roundtrip)
 * - Auf Spieler-Client: emit über `system.<id>` Socket → GM dispatcht
 */
export class GMBridgeService {
  private static readonly handlers = new Map<string, Handler>();
  private static registered = false;

  /** Einmalige Socket-Registrierung. Aufruf in `ready`-Hook. */
  static register(): void {
    if (GMBridgeService.registered) return;
    if (typeof game === "undefined") return;
    if (typeof game.socket?.on !== "function") {
      Logger.warn("GMBridge: game.socket nicht verfügbar");
      return;
    }
    game.socket.on(SOCKET_NAME, GMBridgeService.onSocketMessage);
    GMBridgeService.registered = true;
    Logger.debug("GMBridge: socket listener registered");
  }

  static registerHandler(action: string, handler: Handler): void {
    GMBridgeService.handlers.set(action, handler);
  }

  /**
   * Führt eine GM-Aktion aus. Auf dem GM-Client direkt, sonst Socket-Emit.
   * Liefert kein Ergebnis zurück — Aktionen sind „fire-and-forget"
   * (Document-Updates synchronisieren sich automatisch zurück).
   */
  static async run(action: string, payload: unknown): Promise<void> {
    if (typeof game === "undefined") return;
    if (game.user?.isGM) {
      await GMBridgeService.dispatchLocal(action, payload);
      return;
    }
    if (!GMBridgeService.hasGMOnline()) {
      ui.notifications?.warn("Aktion benötigt einen aktiven GM, aber keiner ist verbunden.");
      return;
    }
    const envelope: SocketEnvelope = { action, payload };
    game.socket?.emit(SOCKET_NAME, envelope);
  }

  /** True wenn der aktuelle User das Document ohne Bridge updaten darf. */
  static canModifyActor(actor: any): boolean {
    if (typeof game === "undefined") return false;
    if (game.user?.isGM) return true;
    if (!actor) return false;
    if (typeof actor.testUserPermission === "function") {
      return Boolean(actor.testUserPermission(game.user, "OWNER"));
    }
    const ownership = actor.ownership ?? actor.permission ?? {};
    const level = ownership[game.user?.id ?? ""] ?? ownership.default ?? 0;
    return level >= 3; // OWNER
  }

  static canModifyMessage(message: any): boolean {
    if (typeof game === "undefined") return false;
    if (game.user?.isGM) return true;
    if (!message) return false;
    const authorId =
      message.author?.id ?? message.author ?? message.user?.id ?? message.user;
    return authorId === game.user?.id;
  }

  static hasGMOnline(): boolean {
    if (typeof game === "undefined") return false;
    const users = game.users;
    if (!users) return false;
    if (users.activeGM) return true;
    const list: any[] = Array.isArray(users.contents)
      ? users.contents
      : Array.from(users as Iterable<any>);
    return list.some((u: any) => u?.isGM && u?.active);
  }

  // ----------------- Internal -----------------

  private static async onSocketMessage(data: unknown): Promise<void> {
    if (!data || typeof data !== "object") return;
    const env = data as SocketEnvelope;
    if (!env.action) return;
    if (!game.user?.isGM) return; // Nur der GM dispatcht
    await GMBridgeService.dispatchLocal(env.action, env.payload);
  }

  private static async dispatchLocal(action: string, payload: unknown): Promise<void> {
    const handler = GMBridgeService.handlers.get(action);
    if (!handler) {
      Logger.warn("GMBridge: handler missing", { action });
      return;
    }
    try {
      await handler(payload);
    } catch (error) {
      Logger.error("GMBridge: handler failed", { action, error });
    }
  }
}
