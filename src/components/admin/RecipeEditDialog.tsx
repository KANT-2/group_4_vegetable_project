"use client";

import { useEffect, useRef, useState } from "react";
import { RecipeImagePicker } from "./RecipeImagePicker";
import { useUnsavedDialog } from "./useUnsavedDialog";
import { vegetables } from "@/data/mock/vegetables";
import {
  RECIPE_DIFFICULTY_LABELS,
  type Recipe,
  type RecipeDifficulty,
} from "@/types/recipe";

const field =
  "mt-2 min-h-12 w-full rounded-control border border-line bg-white px-3 py-2 text-base font-normal";

export function RecipeEditDialog({
  recipe,
  onSave,
  onClose,
  mode = "edit",
}: {
  recipe: Recipe;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
  mode?: "edit" | "create";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const discard = useUnsavedDialog(dialog);
  const creating = mode === "create";
  const [images, setImages] = useState<string[]>(
    creating
      ? []
      : [
          ...new Set(
            [recipe.imageUrl, ...(recipe.additionalImageUrls ?? [])].filter(
              (image): image is string => Boolean(image),
            ),
          ),
        ].slice(0, 3),
  );
  const [reading, setReading] = useState(false);
  const [ingredients, setIngredients] = useState(
    recipe.ingredients.map((item, index) => ({ ...item, key: index })),
  );
  const [steps, setSteps] = useState(
    recipe.steps.map((text, index) => ({ text, key: index })),
  );
  const nextIngredient = useRef(ingredients.length);
  const nextStep = useRef(steps.length);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onCancel={discard.onCancel}
      aria-labelledby="recipe-edit-title"
      onClose={onClose}
      className={
        creating
          ? "fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-card border border-line bg-white p-6 shadow-xl backdrop:bg-black/25 sm:p-8"
          : "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-xl overflow-y-auto border-l border-line bg-white p-6 shadow-xl backdrop:bg-black/25 sm:p-8"
      }
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="recipe-edit-title" className="text-2xl font-bold">
          {creating ? "레시피 등록하기" : "레시피 정보 수정"}
        </h2>
        <button
          type="button"
          aria-label={creating ? "레시피 등록 닫기" : "레시피 수정 닫기"}
          onClick={discard.requestClose}
          className="min-h-11 min-w-11 text-3xl text-ink-muted"
        >
          ×
        </button>
      </div>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name") ?? "").trim();
          const description = String(data.get("description") ?? "").trim();
          const minutes = String(data.get("minutes") ?? "").trim();
          const servings = String(data.get("servings") ?? "").trim();
          const difficulty = String(data.get("difficulty") ?? "");
          const cleanIngredients = ingredients.map(({ name, amount }) => ({
            name: name.trim(),
            amount: amount.trim(),
          }));
          const cleanSteps = steps.map(({ text }) => text.trim());
          if (reading) return;
          const primary = [...vegetables, ...recipe.vegetables].find(
            (item) => item.id === data.get("vegetable"),
          );
          if (images.length < 1 || images.length > 3 || !primary) {
            setError("이미지 1~3장과 주재료를 선택해 주세요.");
            return;
          }
          if (
            !name ||
            !description ||
            !cleanIngredients.length ||
            cleanIngredients.some((item) => !item.name || !item.amount) ||
            !cleanSteps.length ||
            cleanSteps.some((text) => !text)
          ) {
            setError(
              "레시피명·설명·재료와 분량·조리 순서를 모두 입력해 주세요.",
            );
            return;
          }
          if (
            (minutes &&
              (!/^\d+$/.test(minutes) ||
                Number(minutes) < 1 ||
                Number(minutes) > 1440)) ||
            !servings ||
            !/^\d+$/.test(servings) ||
            Number(servings) < 1 ||
            Number(servings) > 10
          ) {
            setError(
              "조리 시간은 1~1,440분, 인분은 1~10인분 사이에서 선택해 주세요.",
            );
            return;
          }
          if (
            difficulty &&
            !Object.hasOwn(RECIPE_DIFFICULTY_LABELS, difficulty)
          ) {
            setError("난이도를 선택해 주세요.");
            return;
          }
          onSave({
            ...recipe,
            name,
            description,
            cookTimeMin: minutes ? Number(minutes) : null,
            servings: servings ? Number(servings) : undefined,
            difficulty: difficulty ? (difficulty as RecipeDifficulty) : null,
            ingredients: cleanIngredients,
            steps: cleanSteps,
            ...{
              imageUrl: images[0],
              additionalImageUrls: images.slice(1),
              primaryVegetableId: primary!.id,
              vegetables: [
                {
                  id: primary!.id,
                  name: primary!.name,
                  imageUrl: primary!.imageUrl,
                },
              ],
            },
          });
          dialog.current?.close();
        }}
      >
        {
          <>
            <RecipeImagePicker
              images={images}
              onChange={setImages}
              onReading={setReading}
            />
            <label className="block text-sm font-bold">
              주재료
              <select
                name="vegetable"
                required
                defaultValue={
                  recipe.primaryVegetableId ?? recipe.vegetables[0]?.id ?? ""
                }
                className={field}
              >
                <option value="" disabled>
                  주재료 선택
                </option>
                {vegetables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
        <label className="block text-sm font-bold">
          레시피명
          <input
            name="name"
            defaultValue={recipe.name}
            required
            maxLength={100}
            className={field}
          />
        </label>
        <label className="block text-sm font-bold">
          설명
          <textarea
            name="description"
            defaultValue={recipe.description}
            required
            maxLength={2000}
            rows={3}
            className={field}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-bold">
            조리 시간 (분)
            <input
              name="minutes"
              inputMode="numeric"
              defaultValue={recipe.cookTimeMin ?? ""}
              placeholder="예: 20분"
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            인분
            <select
              name="servings"
              defaultValue={
                recipe.servings && recipe.servings <= 10 ? recipe.servings : ""
              }
              required
              className={field}
            >
              <option value="">인분 선택</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map(
                (number) => (
                  <option key={number} value={number}>
                    {number}인분
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold">
          난이도
          <select
            name="difficulty"
            defaultValue={recipe.difficulty ?? ""}
            className={field}
          >
            <option value="">난이도 선택</option>
            {Object.entries(RECIPE_DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="mb-3 text-sm font-bold">재료 및 분량</legend>
          <div className="space-y-3">
            {ingredients.map((item, index) => (
              <div key={item.key} className="flex items-center gap-2">
                <input
                  aria-label={`${index + 1}번째 재료명`}
                  value={item.name}
                  required
                  maxLength={100}
                  placeholder="재료명"
                  onChange={(event) =>
                    setIngredients((previous) =>
                      previous.map((value) =>
                        value.key === item.key
                          ? { ...value, name: event.target.value }
                          : value,
                      ),
                    )
                  }
                  className="min-h-12 min-w-0 flex-1 rounded-control border border-line px-3 text-sm"
                />
                <input
                  aria-label={`${index + 1}번째 재료 분량`}
                  value={item.amount}
                  required
                  maxLength={100}
                  placeholder="분량"
                  onChange={(event) =>
                    setIngredients((previous) =>
                      previous.map((value) =>
                        value.key === item.key
                          ? { ...value, amount: event.target.value }
                          : value,
                      ),
                    )
                  }
                  className="min-h-12 min-w-0 flex-1 rounded-control border border-line px-3 text-sm"
                />
                <button
                  type="button"
                  disabled={ingredients.length === 1}
                  aria-label={`${index + 1}번째 재료 삭제`}
                  onClick={() =>
                    setIngredients((previous) =>
                      previous.filter((value) => value.key !== item.key),
                    )
                  }
                  className="min-h-11 min-w-11 text-ink-muted disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setIngredients((previous) => [
                ...previous,
                { name: "", amount: "", key: nextIngredient.current++ },
              ])
            }
            className="mt-2 min-h-11 text-sm font-bold text-brand"
          >
            + 재료 추가
          </button>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-bold">조리 순서</legend>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-start gap-2">
                <span className="pt-3 text-sm font-bold text-brand">
                  {index + 1}
                </span>
                <textarea
                  aria-label={`${index + 1}단계 조리 방법`}
                  value={step.text}
                  required
                  rows={3}
                  maxLength={2000}
                  onChange={(event) =>
                    setSteps((previous) =>
                      previous.map((value) =>
                        value.key === step.key
                          ? { ...value, text: event.target.value }
                          : value,
                      ),
                    )
                  }
                  className="min-w-0 flex-1 rounded-control border border-line px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={steps.length === 1}
                  aria-label={`${index + 1}단계 삭제`}
                  onClick={() =>
                    setSteps((previous) =>
                      previous.filter((value) => value.key !== step.key),
                    )
                  }
                  className="min-h-11 min-w-11 text-ink-muted disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setSteps((previous) => [
                ...previous,
                { text: "", key: nextStep.current++ },
              ])
            }
            className="mt-2 min-h-11 text-sm font-bold text-brand"
          >
            + 단계 추가
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={discard.requestClose}
            className="btn btn-secondary flex-1"
          >
            취소
          </button>
          <button disabled={reading} className="btn btn-primary flex-1">
            {reading ? "이미지 확인 중…" : creating ? "레시피 등록" : "저장"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
