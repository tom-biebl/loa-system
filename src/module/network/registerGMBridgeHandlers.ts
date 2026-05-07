import { GMBridgeService } from "./GMBridgeService.js";
import { DamageService } from "../combat/DamageService.js";
import { Logger } from "../utils/Logger.js";

interface UpdateChatMessagePayload {
  messageId: string;
  update: Record<string, unknown>;
}

interface ApplyDamagePayload {
  actorId: string;
  amount: number;
  type?: string;
  resourceKey?: string;
  silent?: boolean;
}

interface ApplyHealPayload {
  actorId: string;
  amount: number;
  resourceKey?: string;
}

/**
 * Registriert alle GM-seitigen Handler. Spieler-Clients emittet diese
 * Aktionen via Socket — der GM-Client führt sie hier aus.
 */
export function registerGMBridgeHandlers(): void {
  GMBridgeService.registerHandler(
    "updateChatMessage",
    async (payload: UpdateChatMessagePayload) => {
      const message = game.messages?.get?.(payload.messageId);
      if (!message) {
        Logger.warn("Bridge: chat message not found", { messageId: payload.messageId });
        return;
      }
      await message.update(payload.update);
    },
  );

  GMBridgeService.registerHandler(
    "applyDamage",
    async (payload: ApplyDamagePayload) => {
      const actor = game.actors?.get?.(payload.actorId);
      if (!actor) {
        Logger.warn("Bridge: actor not found for damage", { actorId: payload.actorId });
        return;
      }
      await DamageService.applyDamageLocal(actor, payload.amount, {
        type: payload.type as any,
        resourceKey: payload.resourceKey,
        silent: payload.silent,
      });
    },
  );

  GMBridgeService.registerHandler(
    "applyHeal",
    async (payload: ApplyHealPayload) => {
      const actor = game.actors?.get?.(payload.actorId);
      if (!actor) {
        Logger.warn("Bridge: actor not found for heal", { actorId: payload.actorId });
        return;
      }
      await DamageService.healLocal(actor, payload.amount, payload.resourceKey ?? "hp");
    },
  );
}
