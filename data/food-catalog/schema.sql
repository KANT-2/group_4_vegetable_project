PRAGMA foreign_keys = ON;
CREATE TABLE sources (
 id TEXT PRIMARY KEY, organization TEXT NOT NULL, title TEXT NOT NULL,
 url TEXT NOT NULL UNIQUE, accessed_at TEXT NOT NULL, verification TEXT NOT NULL,
 confirmed_fields TEXT NOT NULL CHECK(json_valid(confirmed_fields)), license_status TEXT NOT NULL,
 evidence_sha256 TEXT NOT NULL CHECK(length(evidence_sha256)=64)
);
CREATE TABLE vegetables (
 id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, scientific_name TEXT,
 description TEXT NOT NULL, preparation TEXT, source_id TEXT NOT NULL REFERENCES sources,
 verification TEXT NOT NULL, safety_rule TEXT NOT NULL, safety_status TEXT NOT NULL
);
CREATE TABLE nutrition (
 id TEXT PRIMARY KEY, vegetable_id TEXT NOT NULL REFERENCES vegetables, food_code TEXT NOT NULL,
 variety TEXT NOT NULL, form TEXT NOT NULL, basis_g REAL NOT NULL CHECK(basis_g=100), basis TEXT NOT NULL,
 edition INTEGER NOT NULL, pdf_pages TEXT NOT NULL, original_reference TEXT NOT NULL,
 source_id TEXT NOT NULL REFERENCES sources, verification TEXT NOT NULL, fat_value_status TEXT NOT NULL,
 dietary_fiber_g REAL CHECK(dietary_fiber_g>=0), energy_kcal REAL CHECK(energy_kcal>=0),
 carbohydrate_g REAL CHECK(carbohydrate_g>=0), protein_g REAL CHECK(protein_g>=0), fat_g REAL CHECK(fat_g>=0),
 sodium_mg REAL CHECK(sodium_mg>=0), potassium_mg REAL CHECK(potassium_mg>=0), calcium_mg REAL CHECK(calcium_mg>=0),
 iron_mg REAL CHECK(iron_mg>=0), vitamin_c_mg REAL CHECK(vitamin_c_mg>=0), beta_carotene_ug REAL CHECK(beta_carotene_ug>=0),
 UNIQUE(food_code,edition,form,basis_g)
);
CREATE TABLE seasons (
 id TEXT PRIMARY KEY, vegetable_id TEXT NOT NULL REFERENCES vegetables, kind TEXT NOT NULL CHECK(kind IN ('harvest','best_season')),
 start_month INTEGER CHECK(start_month BETWEEN 1 AND 12), end_month INTEGER CHECK(end_month BETWEEN 1 AND 12),
 region TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES sources, verification TEXT NOT NULL
);
CREATE TABLE storage (
 id TEXT PRIMARY KEY, vegetable_id TEXT NOT NULL REFERENCES vegetables, form TEXT NOT NULL, guidance TEXT NOT NULL,
 temp_min_c REAL, temp_max_c REAL, duration_min REAL CHECK(duration_min>0), duration_max REAL CHECK(duration_max>=duration_min),
 duration_unit TEXT, humidity TEXT, source_id TEXT NOT NULL REFERENCES sources, verification TEXT NOT NULL,
 CHECK((duration_min IS NULL AND duration_max IS NULL AND duration_unit IS NULL) OR
 (duration_min IS NOT NULL AND duration_max IS NOT NULL AND duration_unit IS NOT NULL))
);
CREATE TABLE grade_reasons (
 id TEXT PRIMARY KEY, vegetable_id TEXT NOT NULL REFERENCES vegetables, code TEXT NOT NULL, description TEXT NOT NULL,
 classification TEXT NOT NULL CHECK(classification='editorial_example'), edibility_guarantee INTEGER NOT NULL CHECK(edibility_guarantee=0),
 UNIQUE(vegetable_id,code)
);
CREATE TABLE ingredients (
 id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, vegetable_id TEXT REFERENCES vegetables
);
CREATE TABLE recipes (
 id TEXT PRIMARY KEY, title TEXT NOT NULL UNIQUE, source_id TEXT NOT NULL REFERENCES sources,
 servings REAL CHECK(servings>0), cook_time_min REAL CHECK(cook_time_min>0), difficulty TEXT,
 difficulty_status TEXT NOT NULL, verification TEXT NOT NULL, description TEXT NOT NULL,
 substitutions TEXT, ugly_use_point TEXT NOT NULL, ugly_use_status TEXT NOT NULL, aliases TEXT NOT NULL CHECK(json_valid(aliases))
);
CREATE TABLE recipe_ingredients (
 id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL REFERENCES recipes, ingredient_id TEXT NOT NULL REFERENCES ingredients,
 position INTEGER NOT NULL CHECK(position>0), source_name TEXT NOT NULL, quantity REAL CHECK(quantity>0), unit TEXT,
 quantity_text TEXT NOT NULL, quantity_status TEXT NOT NULL CHECK(quantity_status IN ('verified','source_unspecified','qualitative','ambiguous')),
 role TEXT NOT NULL CHECK(role IN ('required','optional')), role_status TEXT NOT NULL, form TEXT NOT NULL,
 source_id TEXT NOT NULL REFERENCES sources, UNIQUE(recipe_id,position),
 CHECK((quantity_status='verified' AND quantity IS NOT NULL AND unit IS NOT NULL) OR
 (quantity_status<>'verified' AND quantity IS NULL AND unit IS NULL))
);
CREATE INDEX recipe_ingredient_lookup ON recipe_ingredients(ingredient_id,recipe_id);
CREATE TABLE recipe_steps (
 id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL REFERENCES recipes, position INTEGER NOT NULL CHECK(position>0),
 instruction TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES sources,
 duration_min REAL CHECK(duration_min>0), duration_max REAL CHECK(duration_max>=duration_min), temperature_c REAL,
 UNIQUE(recipe_id,position)
);
CREATE TABLE images (
 id TEXT PRIMARY KEY, recipe_id TEXT REFERENCES recipes, vegetable_id TEXT REFERENCES vegetables,
 url TEXT NOT NULL, source_page TEXT NOT NULL, author TEXT, license TEXT, license_url TEXT, alt TEXT NOT NULL,
 match_status TEXT NOT NULL, usage_status TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES sources,
 CHECK((recipe_id IS NOT NULL AND vegetable_id IS NULL) OR (recipe_id IS NULL AND vegetable_id IS NOT NULL)),
 CHECK(usage_status<>'usable' OR (author IS NOT NULL AND license IS NOT NULL AND license_url IS NOT NULL AND match_status='visually_verified'))
);
CREATE TABLE claims (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, field TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES sources,
 status TEXT NOT NULL CHECK(status IN ('verified','editorial','pending')), note TEXT NOT NULL
);
CREATE TABLE gaps (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, field TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL CHECK(status='pending')
);
