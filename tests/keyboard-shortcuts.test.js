import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/event-bus.js';
import * as keyboardShortcuts from '../src/input/keyboard-shortcuts.js';

describe('keyboard-shortcuts', () => {
  let recorder;

  beforeEach(() => {
    document.body.innerHTML = '';
    recorder = {
      start: vi.fn(),
      stop: vi.fn(),
      isRecording: vi.fn(() => false),
    };
    window.SM = {
      lang: 'en',
      bus: new EventBus(),
      modules: {
        output: { recorder },
        render3d: { panoramaBind: { resetView: vi.fn() } },
      },
    };
    keyboardShortcuts.init();
  });

  afterEach(() => {
    keyboardShortcuts.destroy();
    document.body.innerHTML = '';
  });

  it('starts recording when R is pressed', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));

    expect(recorder.start).toHaveBeenCalledWith(10);
    expect(recorder.stop).not.toHaveBeenCalled();
  });

  it('stops recording when R is pressed during an active recording', () => {
    recorder.isRecording.mockReturnValue(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));

    expect(recorder.stop).toHaveBeenCalled();
    expect(recorder.start).not.toHaveBeenCalled();
  });
});
