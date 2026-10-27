import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readContent,
  mutateContent,
  hiddenContent,
} from "../src/lib/managed-content.ts";

test("깨진 관리자 저장 파일은 기본값으로 덮어쓰지 않고 보존한다", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "managed-corrupt-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "catalog.json");
  for (const content of ["{broken", "null", '{"revision":1,"state":{}}']) {
    await writeFile(path, content);
    assert.throws(() =>
      mutateContent({ type: "products", update: [] }, 0, path),
    );
    assert.equal(await readFile(path, "utf8"), content);
  }
});

test("관리자 변경은 서버 파일에 유지되며 품절·삭제·복원과 동시 수정 충돌을 처리한다", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "managed-content-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "catalog.json");
  const initial = readContent(path);
  const target = initial.state.products.find((product) => product.isActive);
  const saved = mutateContent(
    {
      type: "products",
      update: initial.state.products.map((product) =>
        product.id === target.id
          ? { ...product, price: 1700, stock: 0 }
          : product,
      ),
    },
    0,
    path,
  );
  const reread = readContent(path);
  assert.equal(reread.revision, 1);
  assert.equal(
    reread.state.products.find((product) => product.id === target.id).price,
    1700,
  );
  assert.equal(
    reread.state.products.find((product) => product.id === target.id).stock,
    0,
  );
  assert.equal(
    reread.state.products.find((product) => product.id === target.id).isActive,
    true,
  );
  assert.throws(
    () =>
      mutateContent(
        { type: "products", update: initial.state.products },
        0,
        path,
      ),
    /CONTENT_CONFLICT/,
  );
  const entry = saved.state.products.find(
    (product) => product.id === target.id,
  );
  const trashed = mutateContent(
    {
      type: "trash",
      entry: {
        kind: "product",
        item: entry,
        deletedAt: new Date().toISOString(),
      },
    },
    1,
    path,
  );
  assert.equal(hiddenContent(trashed.state, "product", target.id), true);
  const restored = mutateContent(
    { type: "restore", kind: "product", id: target.id },
    2,
    path,
  );
  assert.equal(hiddenContent(restored.state, "product", target.id), false);
  assert.equal(
    restored.state.products.find((product) => product.id === target.id).price,
    1700,
  );
  const recipe = {
    id: "test-recipe",
    name: "저장한 요리",
    description: "변경 내용",
    ingredients: [],
    steps: ["조리"],
    products: [],
    vegetables: [],
  };
  mutateContent({ type: "save-recipe", recipe }, 3, path);
  assert.equal(
    readContent(path).state.recipeChanges[recipe.id].name,
    recipe.name,
  );
});
