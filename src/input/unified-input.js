export class UnifiedInput {
  constructor(bus, target = document.body) {
    this.bus = bus;
    this.target = target;
    this.targets = new Map();
    this._pointers = new Map();
    this._primaryPointerId = null;
    this._down = null;
    this._isDragging = false;
    this._isPinching = false;
    this._lastPinchDistance = 0;
    this._bind();
  }

  _bind() {
    this.target.style.touchAction = 'none';
    this.target.addEventListener('pointerdown', this._onDown);
    this.target.addEventListener('pointermove', this._onMove);
    this.target.addEventListener('pointerup', this._onUp);
    this.target.addEventListener('pointercancel', this._onUp);
    this.target.addEventListener('wheel', this._onWheel, { passive: false });
    this._longPressTimer = 0;
    this._longPressTriggered = false;
    this._longPressStartX = 0;
    this._longPressStartY = 0;
    this._longPressTarget = null;
    this._longPressStartAt = 0;
  }

  _startLongPress(x, y, target) {
    this._cancelLongPress();
    this._longPressStartX = x;
    this._longPressStartY = y;
    this._longPressTarget = target;
    this._longPressStartAt = performance.now();
    this._longPressTimer = window.setTimeout(() => {
      this._longPressTriggered = true;
      this.bus.emit('input:long-press-start', {
        x: this._longPressStartX,
        y: this._longPressStartY,
        target: this._longPressTarget,
      });
    }, 460);
  }

  _cancelLongPress(fireEnd = true) {
    if (this._longPressTimer) {
      window.clearTimeout(this._longPressTimer);
      this._longPressTimer = 0;
    }
    if (fireEnd && this._longPressTriggered) {
      this.bus.emit('input:long-press-end', {
        x: this._longPressStartX,
        y: this._longPressStartY,
        target: this._longPressTarget,
      });
    }
    this._longPressTriggered = false;
  }

  bindTarget(el, name) {
    if (!el) {
      console.warn('[input] bindTarget: el is null');
      return;
    }
    this.targets.set(el, name);
  }

  unbindTarget(el) {
    this.targets.delete(el);
  }

  _resolveTarget(x, y) {
    for (const [el, name] of this.targets) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return name;
      }
    }
    return 'background';
  }

  _snapshotPointer(event) {
    return {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  _getPinchData() {
    const [first, second] = Array.from(this._pointers.values());
    if (!first || !second) return null;

    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;

    return {
      distance: Math.hypot(dx, dy),
      centerX,
      centerY,
      target: this._resolveTarget(centerX, centerY),
    };
  }

  _startPinch() {
    const pinch = this._getPinchData();
    if (!pinch) return;

    this._isPinching = true;
    this._isDragging = false;
    this._lastPinchDistance = pinch.distance;
    this.bus.emit('input:pinch-start', {
      x: pinch.centerX,
      y: pinch.centerY,
      distance: pinch.distance,
      scaleDelta: 1,
      target: pinch.target,
    });
  }

  _onDown = (event) => {
    this._pointers.set(event.pointerId, this._snapshotPointer(event));

    if (this._pointers.size === 1) {
      this._primaryPointerId = event.pointerId;
      this._down = { x: event.clientX, y: event.clientY };
      this._isDragging = false;
      this._isPinching = false;
      this._startLongPress(event.clientX, event.clientY, this._resolveTarget(event.clientX, event.clientY));
      return;
    }

    if (this._pointers.size === 2) {
      this._cancelLongPress();
      if (this._isDragging && this._down) {
        this.bus.emit('input:drag-end', {
          x: event.clientX,
          y: event.clientY,
          target: this._resolveTarget(this._down.x, this._down.y),
        });
      }
      this._startPinch();
    }
  };

  _onMove = (event) => {
    if (!this._pointers.has(event.pointerId)) return;
    this._pointers.set(event.pointerId, this._snapshotPointer(event));

    if (this._isPinching && this._pointers.size >= 2) {
      const pinch = this._getPinchData();
      if (!pinch || !this._lastPinchDistance) return;

      const scaleDelta = pinch.distance / this._lastPinchDistance;
      this._lastPinchDistance = pinch.distance;
      this.bus.emit('input:pinch', {
        x: pinch.centerX,
        y: pinch.centerY,
        distance: pinch.distance,
        scaleDelta,
        target: pinch.target,
      });
      return;
    }

    if (this._primaryPointerId !== event.pointerId || !this._down) return;

    const dx = event.clientX - this._down.x;
    const dy = event.clientY - this._down.y;
    if (!this._isDragging && Math.hypot(dx, dy) < 5) return;

    if (!this._isDragging) {
      this._cancelLongPress(false);
    }

    if (!this._isDragging) {
      this._isDragging = true;
      const target = this._resolveTarget(this._down.x, this._down.y);
      this.bus.emit('input:drag-start', { x: this._down.x, y: this._down.y, target });
    }

    const target = this._resolveTarget(this._down.x, this._down.y);
    this.bus.emit('input:drag', { x: event.clientX, y: event.clientY, dx, dy, target });
  };

  _onUp = (event) => {
    const snapshot = this._pointers.get(event.pointerId);
    if (!snapshot) return;

    const activePointers = this._pointers.size;
    this._pointers.delete(event.pointerId);

    if (this._isPinching && activePointers >= 2 && this._pointers.size < 2) {
      const pinchTarget = this._resolveTarget(snapshot.x, snapshot.y);
      this.bus.emit('input:pinch-end', {
        x: snapshot.x,
        y: snapshot.y,
        target: pinchTarget,
      });
      this._isPinching = false;
      this._lastPinchDistance = 0;
      this._primaryPointerId = null;
      this._down = null;
      this._isDragging = false;
      return;
    }

    this._cancelLongPress();

    if (this._primaryPointerId !== event.pointerId) return;

    const target = this._resolveTarget(this._down?.x ?? snapshot.x, this._down?.y ?? snapshot.y);
    if (this._isDragging) {
      this.bus.emit('input:drag-end', { x: event.clientX, y: event.clientY, target });
    } else {
      this.bus.emit('input:tap', { x: event.clientX, y: event.clientY, target });
    }

    this._primaryPointerId = null;
    this._down = null;
    this._isDragging = false;
  };

  _onWheel = (event) => {
    const target = this._resolveTarget(event.clientX, event.clientY);
    this.bus.emit('input:wheel', {
      x: event.clientX,
      y: event.clientY,
      deltaY: event.deltaY,
      target,
    });
    event.preventDefault();
  };
}
