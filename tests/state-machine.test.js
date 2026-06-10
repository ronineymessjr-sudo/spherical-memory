import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/event-bus.js';
import { StateMachine } from '../src/core/state-machine.js';

describe('StateMachine', () => {
  beforeEach(() => {
    window.SM = { currentState: 'cover', prevState: null };
  });

  it('allows legal transitions and updates window.SM', () => {
    const machine = new StateMachine(new EventBus());

    expect(machine.go('mirror')).toBe(true);
    expect(machine.state).toBe('mirror');
    expect(window.SM.currentState).toBe('mirror');
    expect(window.SM.prevState).toBe('cover');
  });

  it('rejects illegal transitions', () => {
    const machine = new StateMachine(new EventBus());
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(machine.go('share')).toBe(false);
    expect(machine.state).toBe('cover');
    expect(window.SM.currentState).toBe('cover');
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});
