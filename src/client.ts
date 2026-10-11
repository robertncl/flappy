import { DT } from "./engine";
import { setupInput } from "./input";
import { initRenderer, render } from "./render";
import { update } from "./state";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const slider = document.querySelector<HTMLInputElement>("#difficulty")!;
const sliderOutput = document.querySelector<HTMLOutputElement>("#difficulty-name")!;
initRenderer(canvas);
setupInput(canvas, slider, sliderOutput);

// --- main loop: fixed-timestep simulation, render once per frame ------------

let last = performance.now();
let acc = 0;

function frame(now: number): void {
  acc += Math.min((now - last) / 1000, 0.25);
  last = now;
  while (acc >= DT) {
    update();
    acc -= DT;
  }
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame((t) => {
  last = t;
  requestAnimationFrame(frame);
});
