import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(
    new URL("../src/components/common/HomeBanner.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
);

test("홈 배너는 2초마다 5장을 순환하고 멈춤·포커스·호버·동작 줄이기를 존중한다", () => {
  const values = [];
  let cursor,
    cleanup,
    timer,
    reduced = false;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "next/link": { default: "a" },
    "next/image": { default: "img" },
    "./SafeImage": { SafeImage: "img" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useState(initial) {
        const i = cursor++;
        values[i] ??= initial;
        return [
          values[i],
          (next) => {
            values[i] = typeof next === "function" ? next(values[i]) : next;
          },
        ];
      },
      useCallback: (fn) => fn,
      useSyncExternalStore: (_, snapshot) => snapshot(),
      useEffect(fn) {
        cleanup?.();
        cleanup = fn();
      },
    },
  };
  const window = {
    matchMedia: () => ({ matches: reduced }),
    setInterval: (fn, ms) => {
      timer = { fn, ms };
      return 1;
    },
    clearInterval: () => {
      timer = undefined;
    },
  };
  const exports = {};
  new Function("require", "exports", "window", outputText)(
    (name) => modules[name],
    exports,
    window,
  );
  const slides = Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    layout: "artwork",
    href: "/products",
    imageUrl: `/banner-${i}.png`,
    eyebrow: "혜택",
    title: `배너 ${i}`,
    cta: "보기",
  }));
  const render = () => {
    cursor = 0;
    return exports.HomeBanner({ slides, intervalMs: 2000 });
  };
  const nodes = (tree) =>
    Array.isArray(tree)
      ? tree.flatMap(nodes)
      : tree?.props
        ? [tree, ...nodes(tree.props.children)]
        : [];
  const current = (tree) =>
    nodes(tree).find(
      (node) =>
        node.props["aria-roledescription"] === "슬라이드" &&
        !node.props["aria-hidden"],
    ).props["aria-label"];
  let tree = render();
  assert.equal(timer.ms, 2000);
  for (let i = 1; i <= 5; i++) {
    timer.fn();
    tree = render();
    assert.equal(current(tree), `${(i % 5) + 1} / 5`);
  }
  nodes(tree)
    .find((node) => node.props["aria-label"] === "배너 멈춤")
    .props.onClick();
  tree = render();
  assert.equal(timer, undefined);
  nodes(tree)
    .find((node) => node.props["aria-label"] === "배너 자동 넘김 시작")
    .props.onClick();
  tree = render();
  assert.equal(timer.ms, 2000);
  tree.props.onFocusCapture();
  tree = render();
  tree.props.onMouseEnter();
  tree = render();
  tree.props.onMouseLeave();
  tree = render();
  assert.equal(timer, undefined);
  tree.props.onBlurCapture({ currentTarget: { contains: () => false } });
  tree = render();
  assert.equal(timer.ms, 2000);
  reduced = true;
  render();
  assert.equal(timer, undefined);
});
