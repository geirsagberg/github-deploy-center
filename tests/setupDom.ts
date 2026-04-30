import { Window } from 'happy-dom'

const window = new Window({
  url: 'http://localhost/',
})

for (const key of [
  'window',
  'document',
  'navigator',
  'Node',
  'Text',
  'Element',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'HTMLInputElement',
  'SVGElement',
  'DocumentFragment',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'FocusEvent',
  'InputEvent',
  'MutationObserver',
  'ResizeObserver',
  'localStorage',
] as const) {
  Object.defineProperty(globalThis, key, {
    value: window[key],
    configurable: true,
    writable: true,
  })
}

Object.defineProperty(globalThis, 'getComputedStyle', {
  value: window.getComputedStyle.bind(window),
  configurable: true,
  writable: true,
})

Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(Date.now()), 0),
  configurable: true,
  writable: true,
})

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (handle: number) => window.clearTimeout(handle),
  configurable: true,
  writable: true,
})

window.factoryStack = window.factoryStack ?? {}
