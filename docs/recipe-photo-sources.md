# 레시피 참고 사진 출처 (2026-10-12)

공식 레시피의 실제 조리 결과 사진이 아닙니다. 유사 요리 참고 이미지로 표시하며, 기존 DB 이미지가 있으면 우선합니다. 정적 파일에 출처를 함께 보존합니다.

| 파일                               | 작가                                               | 원본·라이선스                                                                                                                                                           |
| ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/images/recipes/soup.jpg`         | by Junho Jung at Flickr from South Korea           | [원본](https://commons.wikimedia.org/wiki/File:Korea-Sokcho-Gamja_ongsimi-Potato_dumpling_soup-02.jpg) · [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `/images/recipes/pancake.jpg`      | by karendotcom127                                  | [원본](https://commons.wikimedia.org/wiki/File:Korean_pancake-Jeon-01.jpg) · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)                                   |
| `/images/recipes/salad.jpg`        | Andy Li                                            | [원본](https://commons.wikimedia.org/wiki/File:Tomato,_Pesto_%26_Bocconcini_Salad_-_Fatto_a_Mano.jpg) · [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `/images/recipes/dumplings.jpg`    | Piotrus                                            | [원본](https://commons.wikimedia.org/wiki/File:Korean_mandu_dumplings.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)                             |
| `/images/recipes/pasta.jpg`        | Vyacheslav Argenberg                               | [원본](https://commons.wikimedia.org/wiki/File:Spaghetti_dish,_Wine,_Rostov-on-Don,_Russia.jpg) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)              |
| `/images/recipes/gratin.jpg`       | GinoOnassis                                        | [원본](https://commons.wikimedia.org/wiki/File:A_gratin_d_auphinois_on_april_2025.jpg) · [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en)                |
| `/images/recipes/water-kimchi.jpg` | Korea.net / Korean Culture and Information Service | [원본](<https://commons.wikimedia.org/wiki/File:KOCIS_Dongchimi_(4814810848).jpg>) · [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0)                     |
| `/images/recipes/tacos.jpg`        | FranHogan                                          | [원본](https://commons.wikimedia.org/wiki/File:Fish_tacos_with_lemonade.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)                           |
| `/images/recipes/stew.jpg`         | Zahraswaty                                         | [원본](https://commons.wikimedia.org/wiki/File:Vegetables_soup.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)                                    |
| `/images/recipes/japchae.jpg`      | 최광모                                             | [원본](https://commons.wikimedia.org/wiki/File:Japchae.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)                                            |

Wikimedia 제공 축소본(가능한 파일)과 화면 표시용 크롭을 사용했습니다. CC BY-SA 사진을 재배포하거나 가공할 때 사진의 해당 라이선스와 작가·출처·변경 내역을 함께 유지하세요. 사진 라이선스를 앱 코드 전체의 라이선스로 해석하지 않습니다. 상세 메타데이터와 원본 다운로드 주소는 `src/data/recipe-photo-assets.json`에 보존했습니다.

16개 레시피에 대한 연결은 `src/lib/recipe-photos.ts`에서 확인할 수 있습니다. 동일한 참고 사진을 여러 레시피에 연결할 수 있으며 재료와 완성 형태는 실제 레시피와 다를 수 있습니다. 정확한 완성 사진을 확보하면 해당 레시피 DB 이미지로 교체합니다.

## 토마토오리볶음 이미지 교체 (2026-10-12)

기존 확대된 수프 사진을 `public/images/recipes/tomato-duck.png`로 교체했습니다. OpenAI 이미지 생성 도구로 제작한 요리 참고 이미지로, 실제 조리 결과나 원문 사진이 아닙니다. 카드·상세·대체 텍스트와 출처 영역에 AI 생성임을 표시합니다. CC 라이선스 사진으로 표시하지 않습니다. 기존 DB의 실제 사진이 있으면 우선하는 동작은 유지합니다.

같은 확대 수프 사진을 사용하던 닭가슴살양배추찜과 닭가슴살 채소조림도 `chicken-vegetables.png` AI 참고 이미지로 교체했습니다. 동일 이미지가 두 요리에 참고용으로 사용되며 정확한 원문 조리 결과를 재현한 사진은 아닙니다. 기존 `stew.jpg` 파일은 화면에서 사용하지 않습니다.

사진 위의 참고/AI 안내 배지는 사용자 요청으로 제거했습니다. 이미지의 생성 여부와 원본 출처는 이 문서에 보존하며, 공개 라이선스 사진의 작가·라이선스는 화면 아래 접힌 `사진 출처`에서 확인할 수 있습니다.

## 2026-10-12 중복 사진 교체

화면에 출처 패널은 표시하지 않습니다. 새 파일의 사용 조건과 변환 기록은 아래에 보존합니다.

| 파일                                                | 작가                  | 원본                                                                                                                | 라이선스                                                               | 변환                         |
| --------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| /images/recipes/easy-potato-2-internet.webp         | P1898                 | https://commons.wikimedia.org/wiki/File:Gamja_jorim_Korean.jpg                                                      | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)               | WebP encoding / display crop |
| /images/recipes/easy-aehobak-2-internet.webp        | 행복한 초록개구리     | https://commons.wikimedia.org/wiki/File:Aehobak-bokkeum.jpg                                                         | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)               | WebP encoding / display crop |
| /images/recipes/easy-eggplant-2-internet.webp       | Hyeon-Jeong Suk       | https://commons.wikimedia.org/wiki/File:Gaji-bokkeum.jpg                                                            | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)               | WebP encoding / display crop |
| /images/recipes/easy-onion-1-internet.webp          | sheepman              | https://commons.wikimedia.org/wiki/File:Tamagodon.jpg                                                               | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0)         | WebP encoding / display crop |
| /images/recipes/easy-cabbage-1-internet.webp        | Rickard Törnblad      | https://commons.wikimedia.org/wiki/File:Okonomiyaki_on_a_plate_in_a_restaurant_in_Osaka,_Japan_-_September_2015.jpg | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)         | WebP encoding / display crop |
| /images/recipes/easy-spinach-1-internet.webp        | 쑤기언니              | https://commons.wikimedia.org/wiki/File:Sigeumchi-namul.jpg                                                         | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)               | WebP encoding / display crop |
| /images/recipes/easy-spinach-2-internet.webp        | HaJunkiyada           | https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_-_Scrambled_eggs_with_spinach.jpg           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)         | WebP encoding / display crop |
| /images/recipes/easy-broccoli-1-internet.webp       | Flickr user yoppy     | https://commons.wikimedia.org/wiki/File:Tenderstem_broccoli_dressed_with_sesame_sauce_001.jpg                       | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)               | WebP encoding / display crop |
| /images/recipes/easy-broccoli-2-internet.webp       | Horacio Cambeiro      | https://commons.wikimedia.org/wiki/File:Cooked_broccoli_florets_in_a_textured_glass_bowl.jpg                        | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0)         | WebP encoding / display crop |
| /images/recipes/easy-radish-1-internet.webp         | chomjong              | https://commons.wikimedia.org/wiki/File:Mu-saengchae.jpg                                                            | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0)               | WebP encoding / display crop |
| /images/recipes/easy-radish-2-internet.webp         | 초롱                  | https://commons.wikimedia.org/wiki/File:Mu-namul.jpg                                                                | [CC BY 2.0 kr](https://creativecommons.org/licenses/by/2.0/kr/deed.en) | WebP encoding / display crop |
| /images/recipes/official-sprout207811-internet.webp | nabila64              | https://commons.wikimedia.org/wiki/File:Grilled_Eggplant_Salad.jpg                                                  | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)         | WebP encoding / display crop |
| /images/recipes/official-213103-internet.webp       | Dr. Chinchu C.        | https://commons.wikimedia.org/wiki/File:Mushroom_Asparagus_and_Lettuce_Salad.jpg                                    | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)               | WebP encoding / display crop |
| /images/recipes/official-200809-internet.webp       | FBenjr123             | https://commons.wikimedia.org/wiki/File:Chicken_stew_with_mixed_vegetables.jpg                                      | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)         | WebP encoding / display crop |
| /images/recipes/official-211734-internet.webp       | Wikimedia contributor | https://commons.wikimedia.org/wiki/File:Gamja_jorim_%EA%B0%90%EC%9E%90%EC%A1%B0%EB%A6%BC1.jpg                       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)         | WebP encoding / display crop |
| /images/recipes/official-98885-internet.webp        | Kykk wiki             | https://commons.wikimedia.org/wiki/File:Roasted_vegetables.jpg                                                      | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en)        | WebP encoding / display crop |

# 2026-10-12 감자채볶음 사진 교체

사용자가 제공한 사진 두 장을 원본 PNG 그대로 저장했습니다. 원본 출처·작가·라이선스 정보는 제공되지 않았습니다.

- `/images/recipes/easy-potato-1/01.png`: 접시에 담긴 감자채볶음. 목록·메인·상세의 대표 사진입니다.
- `/images/recipes/easy-potato-1/02.png`: 팬에 담긴 감자채볶음. 상세 화면에서 대표 사진과 함께 표시합니다.
- 연결 레시피: `easy-potato-1`. 기존 레시피 내용과 다른 레시피 사진은 유지합니다.

# 2026-10-12 감자 간장조림 사진 교체

사용자가 제공한 사진 두 장을 원본 PNG 그대로 저장했습니다. 원본 출처·작가·라이선스 정보는 제공되지 않았습니다. 이전 Wikimedia 사진의 출처는 아래 기존 기록에 보존합니다.

- `/images/recipes/easy-potato-2/01.png`: 그릇에 담긴 감자 간장조림. 대표 사진입니다.
- `/images/recipes/easy-potato-2/02.png`: 감자 간장조림 근접 사진. 상세 화면의 두 번째 사진입니다.
- 연결 레시피: `easy-potato-2`. 교체한 사진에 기존 Wikimedia 출처가 잘못 붙지 않도록 해당 레시피의 이전 `photoReference`를 제거했습니다.
