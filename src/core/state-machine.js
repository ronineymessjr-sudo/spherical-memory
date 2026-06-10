const STATES = ['cover', 'mirror', 'cracking', 'sphere', 'share'];

const TRANSITIONS = {
  cover: ['mirror', 'cover'],
  mirror: ['cracking', 'cover'],
  cracking: ['sphere', 'cover'],
  sphere: ['share', 'cover'],
  share: ['sphere', 'cover'],
};

export class StateMachine {
  constructor(bus) {
    this.bus = bus;
    this._state = 'cover';
    this._prev = null;
  }

  get state() {
    return this._state;
  }

  get prev() {
    return this._prev;
  }

  go(nextState, payload) {
    if (!STATES.includes(nextState)) {
      console.warn(`[state] unknown state: "${nextState}"`);
      return false;
    }

    if (!this.canGo(nextState)) {
      console.warn(`[state] illegal transition: ${this._state} -> ${nextState}`);
      return false;
    }

    const from = this._state;
    this.bus?.emit('state:before-change', { from, to: nextState, payload });
    this._prev = this._state;
    this._state = nextState;

    if (window.SM) {
      window.SM.currentState = nextState;
      window.SM.prevState = this._prev;
    }

    this.bus?.emit('state:change', { from, to: nextState, payload });
    return true;
  }

  canGo(nextState) {
    return TRANSITIONS[this._state]?.includes(nextState) ?? false;
  }

  onStateChange(callback) {
    return this.bus.on('state:change', callback);
  }
}
