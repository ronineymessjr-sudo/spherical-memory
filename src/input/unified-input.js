// Unified Input - 鼠标/触摸/Pinch 统一为 5 类事件
// 接口契约: docs/INTERFACES.md §4
// Owner: A3 输入层工程师
export class UnifiedInput {
  constructor(bus, target = document.body) {
    this.bus = bus;
    this.target = target;
    this.targets = new Map();
    this._pointerId = null;
    this._down = null;
    this._isDragging = false;
    this._lastPinchDist = 0;
    this._bind();
  }

  _bind() {
    this.target.style.touchAction = 'none';
    this.target.addEventListener('pointerdown', this._onDown);
    this.target.addEventListener('pointermove', this._onMove);
    this.target.addEventListener('pointerup', this._onUp);
    this.target.addEventListener('pointercancel', this._onUp);
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

  _onDown = (e) => {
    if (this._pointerId !== null) return;
    this._pointerId = e.pointerId;
    this._down = { x: e.clientX, y: e.clientY };
    this._isDragging = false;
  };

  _onMove = (e) => {
    if (this._pointerId !== e.pointerId) return;
    if (!this._down) return;
    const dx = e.clientX - this._down.x;
    const dy = e.clientY - this._down.y;
    if (!this._isDragging && Math.hypot(dx, dy) < 5) return;
    if (!this._isDragging) {
      this._isDragging = true;
      const target = this._resolveTarget(this._down.x, this._down.y);
      this.bus.emit('input:drag-start', { x: this._down.x, y: this._down.y, target });
    }
    const target = this._resolveTarget(this._down.x, this._down.y);
    this.bus.emit('input:drag', { x: e.clientX, y: e.clientY, dx, dy, target });
  };

  _onUp = (e) => {
    if (this._pointerId !== e.pointerId) return;
    const target = this._resolveTarget(this._down.x, this._down.y);
    if (this._isDragging) {
      this.bus.emit('input:drag-end', { x: e.clientX, y: e.clientY, target });
    } else {
      this.bus.emit('input:tap', { x: e.clientX, y: e.clientY, target });
    }
    this._pointerId = null;
    this._down = null;
    this._isDragging = false;
  };
}
