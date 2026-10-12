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
