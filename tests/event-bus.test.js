import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/event-bus.js';

describe('EventBus', () => {
  it('broadcasts payloads to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('demo:event', handler);
    bus.emit('demo:event', { ok: true });

    expect(handler).toHaveBeenCalledWith({ ok: true });
  });

  it('supports once handlers', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('demo:event', handler);
    bus.emit('demo:event');
    bus.emit('demo:event');

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
