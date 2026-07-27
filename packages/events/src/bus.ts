import { EventEmitter } from "node:events";
import type { AppEvent, AppEventType } from "./types";

export type EventHandler<E extends AppEvent = AppEvent> = (
  event: E,
) => void | Promise<void>;

export interface EventBus {
  emit(event: AppEvent): void;
  emitMany(events: readonly AppEvent[]): void;
  on<T extends AppEventType>(
    type: T,
    handler: EventHandler<Extract<AppEvent, { type: T }>>,
  ): void;
}

/**
 * In-memory event bus for a single Node process. This is deliberately the
 * simplest thing that works: `notifications`, `analytics`, and `ai` register
 * handlers with `.on(...)`, and other modules emit events through the shared
 * `eventBus` export below.
 *
 * When you outgrow a single process — multiple API instances, background
 * workers, needing events to survive a crash — swap this implementation for
 * one backed by Redis pub/sub, BullMQ, or SQS. Nothing outside this file
 * needs to change, since every caller depends on the `EventBus` interface,
 * not on Node's EventEmitter directly.
 */
export function createInMemoryEventBus(): EventBus {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);

  return {
    emit(event) {
      emitter.emit(event.type, event);
    },
    emitMany(events) {
      for (const event of events) emitter.emit(event.type, event);
    },
    on(type, handler) {
      emitter.on(type, handler as EventHandler);
    },
  };
}

/**
 * Shared instance for the whole app. Import this — don't call
 * createInMemoryEventBus() yourself elsewhere, or emitters and subscribers
 * end up on different buses and events silently go nowhere.
 */
export const eventBus: EventBus = createInMemoryEventBus();
