import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("레시피 사진은 2초마다 순환하고 조작·동작 줄이기·백그라운드를 존중한다", () => {
  let states, cursor, tick, cleanup, cleared;
  const document = { hidden: false };
  let reduced = false;
  const modules = {
    react: {
      useState: (initial) => {
        const slot = cursor++;
        states[slot] ??= initial;
        return [
          states[slot],
          (value) => {
            states[slot] =
              typeof value === "function" ? value(states[slot]) : value;
          },
        ];
      },
      useEffect: (effect) => {
        cleanup = effect();
      },
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "next/link": { default: "a" },
    "@/components/common/SafeImage": { SafeImage: "img" },
  };
  const window = {
    setInterval: (callback, delay) => {
      assert.equal(delay, 2000);
      tick = callback;
      return 7;
    },
    clearInterval: (id) => {
      assert.equal(id, 7);
      cleared = true;
    },
    matchMedia: () => ({ matches: reduced }),
  };
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/components/recipes/RecipeImage.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  new Function("require", "exports", "window", "document", outputText)(
    (name) => modules[name],
    exports,
    window,
    document,
  );
  function render(photos, interacting = false) {
    states = [0, interacting];
    cursor = 0;
    tick = undefined;
    exports.RecipeImage({
      recipe: {
        name: "감자",
        imageUrl: photos[0],
        additionalImageUrls: photos.slice(1),
        vegetables: [],
      },
    });
  }
  render(["1", "2", "3"]);
  tick();
  assert.equal(states[0], 1);
  tick();
  assert.equal(states[0], 2);
  tick();
  assert.equal(states[0], 0);
  document.hidden = true;
  tick();
  assert.equal(states[0], 0);
  document.hidden = false;
  reduced = true;
  tick();
  assert.equal(states[0], 0);
  cleanup();
  assert.equal(cleared, true);
  render(["1", "2"], true);
  assert.equal(tick, undefined);
  render(["1"]);
  assert.equal(tick, undefined);
});
