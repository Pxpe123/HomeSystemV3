/** Readout clocks can lag creation by one tick; never display more than the selected duration. */
export function timerRemaining(timer, now) {
  return Math.max(
    0,
    Math.min(
      timer.duration,
      timer.status === "running" ? timer.endsAt - now : timer.remaining,
    ),
  );
}
