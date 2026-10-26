const normalize = (value: string) =>
  value.toLocaleLowerCase().replace(/\s/g, "");

export function recipeSearchVegetable(
  keyword: string,
  options: { id: string; name: string }[],
) {
  const query = normalize(keyword);
  const matches = options.filter((option) =>
    query.includes(normalize(option.name)),
  );
  // 양배추와 배추처럼 이름이 포함되는 경우 더 구체적인 재료를 선택합니다.
  const distinct = matches.filter(
    (option) =>
      !matches.some(
        (other) =>
          other.id !== option.id &&
          normalize(other.name).includes(normalize(option.name)),
      ),
  );
  return distinct.length === 1 ? distinct[0].id : "";
}
