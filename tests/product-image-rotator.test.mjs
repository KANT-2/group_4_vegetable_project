import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(
    new URL(
      "../src/components/products/ProductImageRotator.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
);

function setup() {
  const slots = [];
  const timers = new Map();
  const listeners = new Map();
  let cursor,
    pending,
    observeVisibility,
    timerId = 0;
  let reduced = false;
  const document = { hidden: false };
  const link = {
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: (event) => listeners.delete(event),
  };
  const modules = {
    react: {
      useState: (initial) => {
        const slot = cursor++;
        slots[slot] ??= { value: initial };
        return [
          slots[slot].value,
          (value) => {
            slots[slot].value =
              typeof value === "function" ? value(slots[slot].value) : value;
          },
        ];
      },
      useRef: () => ({ current: { closest: () => link } }),
      useEffect: (effect, deps) => {
        const slot = cursor++;
        const previous = slots[slot];
        if (
          previous &&
          deps.every((dep, i) => Object.is(dep, previous.deps[i]))
        )
          return;
        pending.push(() => {
          previous?.cleanup?.();
          slots[slot] = { deps, cleanup: effect() };
        });
      },
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "@/components/common/SafeImage": { SafeImage: "img" },
  };
  class IntersectionObserver {
    constructor(callback) {
      observeVisibility = callback;
    }
    observe() {
      observeVisibility([{ isIntersecting: true }]);
    }
    disconnect() {}
  }
  const window = {
    setInterval: (callback, delay) => {
      assert.equal(delay, 2000); // 레시피 사진과 같은 간격
      timers.set(++timerId, callback);
      return timerId;
    },
    clearInterval: (id) => timers.delete(id),
    matchMedia: () => ({ matches: reduced }),
  };
  const exports = {};
  new Function(
    "require",
    "exports",
    "window",
    "document",
    "IntersectionObserver",
    outputText,
  )((name) => modules[name], exports, window, document, IntersectionObserver);
  const render = () => {
    cursor = 0;
    pending = [];
    const tree = exports.ProductImageRotator({
      images: ["1", "2", "3"],
      name: "당근",
    });
    pending.forEach((effect) => effect());
    return tree;
  };
  render();
  render();
  return {
    render,
    timers,
    document,
    focus: () => listeners.get("focus")(),
    blur: () => listeners.get("blur")(),
    visible: (value) => observeVisibility([{ isIntersecting: value }]),
    reduced: (value) => {
      reduced = value;
    },
    tick: () => [...timers.values()].forEach((fn) => fn()),
    unmount: () => slots.forEach((slot) => slot.cleanup?.()),
  };
}

test("상품 링크 포커스가 유지되면 마우스 이탈 후에도 자동 넘김은 정지한다", () => {
  const ui = setup();
  assert.equal(ui.timers.size, 1);
  ui.focus();
  ui.render().props.onMouseEnter();
  ui.render().props.onMouseLeave();
  ui.render();
  assert.equal(ui.timers.size, 0);
  ui.blur();
  ui.render();
  assert.equal(ui.timers.size, 1);
  ui.tick();
  assert.equal(ui.render().props["data-product-image-index"], 2);
  ui.unmount();
  assert.equal(ui.timers.size, 0);
});

test("마우스가 남아 있으면 포커스가 빠져도 정지하며 내부 포커스 이동도 유지한다", () => {
  const ui = setup();
  ui.render().props.onMouseEnter();
  ui.focus();
  ui.render();
  ui.blur();
  ui.render();
  assert.equal(ui.timers.size, 0);
  ui.render().props.onFocusCapture();
  ui.render().props.onBlurCapture({
    currentTarget: { contains: () => true },
    relatedTarget: {},
  });
  ui.render().props.onMouseLeave();
  ui.render();
  assert.equal(ui.timers.size, 0);
  ui.render().props.onBlurCapture({
    currentTarget: { contains: () => false },
    relatedTarget: null,
  });
  ui.render();
  assert.equal(ui.timers.size, 1);
  ui.unmount();
});

test("상품 사진은 화면 밖·백그라운드·동작 줄이기에서 넘어가지 않는다", () => {
  const ui = setup();
  ui.document.hidden = true;
  ui.tick();
  assert.equal(ui.render().props["data-product-image-index"], 1);
  ui.document.hidden = false;
  ui.reduced(true);
  ui.tick();
  assert.equal(ui.render().props["data-product-image-index"], 1);
  ui.visible(false);
  ui.render();
  assert.equal(ui.timers.size, 0);
  ui.visible(true);
  ui.reduced(false);
  ui.render();
  ui.tick();
  assert.equal(ui.render().props["data-product-image-index"], 2);
  ui.unmount();
});

test("상품 사진은 레시피처럼 겹쳐 두고 페이드로 바뀌며 점 표시는 없다", () => {
  const ui = setup();
  const layers = () => ui.render().props.children;
  let current = layers();
  assert.equal(current.length, 3);
  const visibleLayers = (list) =>
    list.filter((layer) => layer.props.className.includes("opacity-100"));
  assert.equal(visibleLayers(current).length, 1);
  assert.match(current[0].props.className, /transition-opacity duration-700/);
  assert.equal(current[0].props["aria-hidden"], false);
  ui.tick();
  current = layers();
  assert.equal(current[1].props["aria-hidden"], false);
  assert.match(current[1].props.className, /opacity-100/);
  assert.match(current[0].props.className, /opacity-0/);
  // 점 표시(인디케이터)는 그리지 않아요.
  assert.ok(current.every((layer) => layer.type === "div"));
  ui.unmount();
});
