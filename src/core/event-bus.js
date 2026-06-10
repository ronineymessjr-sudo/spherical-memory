// Event Bus - 模块间通信唯一通道
// 接口契约: docs/INTERFACES.md §2
// Owner: A2 状态机 + 事件总线工程师
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (typeof handler !== 'function') {
      console.warn(`[bus] on("${event}"): handler must be a function`);
      return () => {};
    }
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const wrapped = (payload) => {
      this.off(event, wrapped);
      handler(payload);
    };
    return this.on(event, wrapped);
  }

  off(event, handler) {
    const set = this.listeners.get(event);
    if (!set) return;
    if (handler) set.delete(handler);
    else set.clear();
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    set.forEach(h => {
      try {
        h(payload);
      } catch (e) {
        console.error(`[bus] handler for "${event}" threw:`, e);
      }
    });
  }

  listenerCount(event) {
    return this.listeners.get(event)?.size ?? 0;
  }
}
