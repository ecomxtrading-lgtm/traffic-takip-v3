/**
 * Event Bus - Modüller arası gevşek bağlı iletişim için
 * Sıcak yolda (heartbeat/presence) kullanılmaz, sadece modüller arası asenkron reaksiyonlar için
 */

export interface EventPayload {
  [key: string]: unknown;
}

export interface EventHandler<T extends EventPayload = EventPayload> {
  (payload: T): void | Promise<void>;
}

export interface EventBus {
  emit<T extends EventPayload>(eventName: string, payload: T): void;
  on<T extends EventPayload>(eventName: string, handler: EventHandler<T>): void;
  off(eventName: string, handler?: EventHandler): void;
  removeAllListeners(eventName?: string): void;
}

class SimpleEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * Emit an event to all registered handlers
   */
  emit<T extends EventPayload>(eventName: string, payload: T): void {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers || eventHandlers.size === 0) {
      return;
    }

    // Execute handlers synchronously for better performance
    // In production, consider using a queue for heavy handlers
    for (const handler of eventHandlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    }
  }

  /**
   * Register an event handler
   */
  on<T extends EventPayload>(eventName: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler as EventHandler);
  }

  /**
   * Remove an event handler
   */
  off(eventName: string, handler?: EventHandler): void {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers) {
      return;
    }

    if (handler) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventName);
      }
    } else {
      this.handlers.delete(eventName);
    }
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get all registered event names
   */
  getEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an event
   */
  getHandlerCount(eventName: string): number {
    return this.handlers.get(eventName)?.size ?? 0;
  }
}

// Global event bus instance
export const eventBus = new SimpleEventBus();

// Common event names with versioning
export const EVENTS = {
  // User events
  USER_CREATED: 'user.created@v1',
  USER_UPDATED: 'user.updated@v1',
  USER_DELETED: 'user.deleted@v1',

  // Session events
  SESSION_STARTED: 'session.started@v1',
  SESSION_ENDED: 'session.ended@v1',

  // E-commerce events
  PRODUCT_VIEWED: 'product.viewed@v1',
  ADD_TO_CART: 'add_to_cart@v1',
  CHECKOUT_STARTED: 'checkout.started@v1',
  PURCHASE_COMPLETED: 'purchase.completed@v1',

  // Analytics events
  PAGE_VIEWED: 'page.viewed@v1',
  EVENT_TRACKED: 'event.tracked@v1',

  // System events
  MODULE_LOADED: 'module.loaded@v1',
  MODULE_ERROR: 'module.error@v1',
  HEALTH_CHECK_FAILED: 'health.check.failed@v1',
} as const;

// Type for event names
export type EventName = typeof EVENTS[keyof typeof EVENTS];

// Helper function to create typed event emitter
export function createEventEmitter<T extends EventPayload>(eventName: string) {
  return (payload: T): void => eventBus.emit(eventName, payload);
}

// Helper function to create typed event listener
export function createEventListener<T extends EventPayload>(
  eventName: string,
  handler: EventHandler<T>
): () => void {
  eventBus.on(eventName, handler as EventHandler);
  return () => eventBus.off(eventName, handler as EventHandler);
}
