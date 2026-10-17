/** Pure gesture interpretation, shared by the home navigator and covered without a browser. */
export class SwipeGesture {
  constructor({ threshold = 75 } = {}) {
    this.threshold = threshold;
    this.start = null;
  }
  begin(x, y) {
    this.start = { x, y };
  }
  offset(x, y) {
    if (!this.start) return 0;
    const dx = x - this.start.x;
    return Math.abs(dx) > Math.abs(y - this.start.y) ? dx : 0;
  }
  end(x, y) {
    const offset = this.offset(x, y);
    this.start = null;
    return Math.abs(offset) >= this.threshold ? (offset < 0 ? 1 : -1) : 0;
  }
  cancel() {
    this.start = null;
  }
}
