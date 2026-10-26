"use client";

import { useRef, useState } from "react";
import { RecipeImage } from "@/components/recipes/RecipeImage";
import { RecipeMeta } from "@/components/recipes/RecipeMeta";
import { RecipeEditDialog } from "./RecipeEditDialog";
import { SearchIcon } from "@/components/common/Icons";
import type { Recipe } from "@/types/recipe";
import { AdminProducts } from "./AdminProducts";
import { useAdminStore } from "./AdminStore";
import { recipeSearchVegetable } from "@/lib/admin-recipe-search";
import { CheckboxDropdown } from "./CheckboxDropdown";
import { RECIPE_DIFFICULTY_LABELS } from "@/types/recipe";

export function AdminRecipes({ recipes }: { recipes: Recipe[] }) {
  const { recipeChanges, trash, saveRecipe, moveToTrash, deletedKeys } =
    useAdminStore();
  const sourceIds = new Set(recipes.map((recipe) => recipe.id));
  const deletedIds = new Set(
    trash
      .filter((entry) => entry.kind === "recipe")
      .map((entry) => entry.item.id),
  );
  for (const key of deletedKeys ?? [])
    if (key.startsWith("recipe:")) deletedIds.add(key.slice("recipe:".length));
  const items = [
    ...Object.values(recipeChanges).filter(
      (recipe) => !sourceIds.has(recipe.id),
    ),
    ...recipes.map((recipe) => recipeChanges[recipe.id] ?? recipe),
  ].filter((recipe) => !deletedIds.has(recipe.id));
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState<Recipe | null>(null);
  const [page, setPage] = useState(1);
  const registerButton = useRef<HTMLButtonElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  const editButton = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("");
  const [vegetable, setVegetable] = useState("");
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(
    [],
  );
  const menu = useRef<HTMLDivElement>(null);
  const options = [
    ...new Map(
      items
        .flatMap((recipe) => recipe.vegetables)
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const normalize = (value: string) =>
    value.toLocaleLowerCase().replace(/\s/g, "");
  const filtered = items.filter(
    (recipe) =>
      (!vegetable || recipe.vegetables.some((item) => item.id === vegetable)) &&
      (selectedDifficulties.length === 0 ||
        (recipe.difficulty !== null &&
          selectedDifficulties.includes(recipe.difficulty))) &&
      normalize(
        [recipe.name, ...recipe.ingredients.map((item) => item.name)].join(" "),
      ).includes(normalize(keyword)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  function goToPage(value: number) {
    setPage(value);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AdminProducts
      view="recipes"
      description="레시피 등록과 레시피 정보를 관리해요."
      topNotice={
        notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-card border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => setNotice("")}
              className="min-h-11 min-w-11"
            >
              ×
            </button>
          </div>
        )
      }
      headerAction={
        <button
          ref={registerButton}
          type="button"
          className="btn btn-primary shrink-0"
          onClick={() => {
            setCreating({
              id: `recipe-${crypto.randomUUID()}`,
              name: "",
              description: "",
              cookTimeMin: null,
              difficulty: null,
              servings: undefined,
              ingredients: [{ name: "", amount: "" }],
              steps: [""],
              products: [],
              vegetables: [],
            });
            setNotice("");
          }}
        >
          + 레시피 등록하기
        </button>
      }
    >
      <div ref={top} className="mt-7 scroll-mt-5">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setKeyword(query.trim());
            setVegetable(recipeSearchVegetable(query, options));
            setPage(1);
          }}
          className="flex flex-wrap gap-3"
        >
          <label htmlFor="admin-recipe-search" className="sr-only">
            요리 이름이나 재료로 검색
          </label>
          <input
            id="admin-recipe-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="요리 이름이나 재료로 검색"
            className="h-12 min-w-0 flex-1 basis-64 rounded-control border border-field-border bg-white px-4"
          />
          <CheckboxDropdown
            label="레시피 난이도"
            options={Object.entries(RECIPE_DIFFICULTY_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
            selected={selectedDifficulties}
            onChange={(values) => {
              setSelectedDifficulties(values);
              setPage(1);
            }}
          />
          <button className="btn btn-primary">
            <SearchIcon width={20} height={20} />
            검색
          </button>
        </form>
        <div className="relative mt-6 border-b border-line pr-10">
          <div
            ref={menu}
            className="flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="레시피 재료별 필터"
          >
            {[{ id: "", name: "전체" }, ...options].map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={vegetable === option.id}
                onClick={() => {
                  setVegetable(option.id);
                  setQuery("");
                  setKeyword("");
                  setPage(1);
                }}
                className={`min-h-14 shrink-0 border-b-2 px-4 text-base font-bold ${vegetable === option.id ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-brand"}`}
              >
                {option.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="다음 재료 보기"
            onClick={() =>
              menu.current?.scrollBy({ left: 300, behavior: "smooth" })
            }
            className="absolute top-0 right-0 flex h-14 w-10 items-center justify-center bg-sand text-2xl"
          >
            ›
          </button>
        </div>
        <p className="mt-8 mb-6 font-bold" aria-live="polite">
          레시피 {filtered.length}개
        </p>
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((recipe) => (
              <article key={recipe.id} className="card h-full overflow-hidden">
                <div className="relative">
                  <RecipeImage
                    recipe={recipe}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <button
                      type="button"
                      aria-label={`${recipe.name} 수정`}
                      onClick={(event) => {
                        editButton.current = event.currentTarget;
                        setEditing(recipe);
                        setNotice("");
                      }}
                      className="min-h-11 rounded-control border border-brand bg-white px-4 text-sm font-bold text-brand shadow-sm hover:bg-brand-soft"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      aria-label={`${recipe.name} 삭제`}
                      onClick={async () => {
                        if (
                          !(await moveToTrash({ kind: "recipe", item: recipe }))
                        )
                          return;
                        setNotice("레시피가 휴지통으로 이동되었습니다.");
                      }}
                      className="min-h-11 rounded-control border border-line bg-white px-4 text-sm font-bold text-danger shadow-sm hover:bg-danger-soft"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4 sm:p-5">
                  <h3 className="text-lg font-extrabold">{recipe.name}</h3>
                  <RecipeMeta recipe={recipe} />
                  <p className="border-t border-line pt-3 text-sm text-ink-muted">
                    <span className="font-bold text-ink">주요 재료</span>{" "}
                    {recipe.ingredients
                      .slice(0, 3)
                      .map((item) => item.name)
                      .join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-line bg-white px-5 py-16 text-center text-ink-muted">
            검색 조건에 맞는 레시피가 없습니다.
          </div>
        )}
        {filtered.length > 0 && (
          <nav
            aria-label="레시피 페이지"
            className="mt-8 flex flex-wrap justify-center gap-1"
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="이전 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ‹
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => goToPage(number)}
                  aria-label={`${number}페이지`}
                  aria-current={number === currentPage ? "page" : undefined}
                  className={`min-h-11 min-w-11 rounded-control ${number === currentPage ? "bg-brand-soft font-bold text-brand" : "hover:bg-white"}`}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage === pages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="다음 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ›
            </button>
          </nav>
        )}
        {creating && (
          <RecipeEditDialog
            key={creating.id}
            recipe={creating}
            mode="create"
            onClose={() => {
              setCreating(null);
              registerButton.current?.focus();
            }}
            onSave={(recipe) => {
              saveRecipe(recipe);
              setQuery("");
              setKeyword("");
              setVegetable("");
              setSelectedDifficulties([]);
              setPage(1);
              setNotice("레시피가 등록되었습니다.");
            }}
          />
        )}
        {editing && (
          <RecipeEditDialog
            key={editing.id}
            recipe={editing}
            onClose={() => {
              setEditing(null);
              if (editButton.current?.isConnected) editButton.current.focus();
              else registerButton.current?.focus();
            }}
            onSave={(updated) => {
              saveRecipe(updated);
              setNotice("레시피 정보가 수정되었습니다.");
            }}
          />
        )}
      </div>
    </AdminProducts>
  );
}
