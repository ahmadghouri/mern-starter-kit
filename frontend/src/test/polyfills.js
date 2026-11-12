// jsdom does not provide these Web APIs that React Router uses.
const { TextDecoder, TextEncoder } = require('node:util');

Object.assign(globalThis, { TextDecoder, TextEncoder });

// Radix UI (shadcn Select) calls these DOM methods, which jsdom does not implement.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
