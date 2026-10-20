import "@testing-library/jest-dom/vitest";
// jsdom lacks these browser APIs that Radix and Vaul use
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
if (!window.matchMedia) window.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.scrollIntoView ??= () => {};
