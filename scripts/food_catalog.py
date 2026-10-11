"""Rebuild and validate the source catalog, with no network or third-party packages."""
import argparse
import json
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/food-catalog'
ORDER = ['sources','vegetables','nutrition','seasons','storage','grade_reasons','ingredients',
         'recipes','recipe_ingredients','recipe_steps','images','claims','gaps']

def rows(table):
    return json.loads((DATA / f'{table}.json').read_text(encoding='utf-8'))

def scalar(value):
    return json.dumps(value,ensure_ascii=False,separators=(',',':')) if isinstance(value,(dict,list)) else value

def seed(db):
    db.executescript((DATA / 'schema.sql').read_text(encoding='utf-8'))
    for table in ORDER:
        for row in rows(table):
            columns = list(row)
            db.execute(f'INSERT INTO {table} ({",".join(columns)}) VALUES ({",".join("?" for _ in columns)})',
                       [scalar(row[k]) for k in columns])
    db.commit()

def validate(db):
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    counts = {t:db.execute(f'SELECT count(*) FROM {t}').fetchone()[0] for t in ORDER}
    assert counts['vegetables']==6 and counts['recipes']>=15
    assert not db.execute('SELECT id FROM recipes WHERE id NOT IN (SELECT recipe_id FROM recipe_steps)').fetchall()
    assert not db.execute('SELECT id FROM recipes WHERE id NOT IN (SELECT recipe_id FROM recipe_ingredients)').fetchall()
    for vid, in db.execute('SELECT id FROM vegetables'):
        assert db.execute('SELECT 1 FROM recipe_ingredients ri JOIN ingredients i ON i.id=ri.ingredient_id WHERE i.vegetable_id=?',(vid,)).fetchone(),vid
        assert db.execute('SELECT 1 FROM nutrition WHERE vegetable_id=?',(vid,)).fetchone(),vid
    for recipe, in db.execute('SELECT id FROM recipes'):
        for table in ['recipe_steps','recipe_ingredients']:
            positions=[x[0] for x in db.execute(f'SELECT position FROM {table} WHERE recipe_id=? ORDER BY position',(recipe,))]
            assert positions==list(range(1,len(positions)+1)),(recipe,table)
    known={x[0] for x in db.execute('SELECT id FROM vegetables UNION SELECT id FROM recipes UNION SELECT id FROM nutrition UNION SELECT id FROM recipe_ingredients')}
    assert all(x[0] in known for x in db.execute('SELECT entity_id FROM claims'))
    assert db.execute("SELECT quantity FROM recipe_ingredients WHERE recipe_id='208146' AND source_name='파프리카'").fetchone()==(None,)
    assert db.execute("SELECT fat_g FROM nutrition WHERE id='02001'").fetchone()==(None,)
    assert not db.execute('SELECT id FROM recipes WHERE cook_time_min IS NOT NULL').fetchall()
    assert db.execute("SELECT food_code FROM nutrition WHERE vegetable_id='aehobak'").fetchone()==('06407',)
    assert not db.execute("SELECT id FROM images WHERE usage_status='usable'").fetchall()
    # Invalid references and fabricated negative values must be rejected by the DB itself.
    for sql in ["UPDATE recipe_ingredients SET ingredient_id='nonexistent' WHERE id='98711-01'",
                "UPDATE nutrition SET energy_kcal=-1 WHERE id='02001'",
                "UPDATE images SET usage_status='usable' WHERE id='98711-image'",
                "UPDATE recipe_ingredients SET quantity=1 WHERE quantity_status='source_unspecified'"]:
        db.execute('SAVEPOINT invalid_case')
        try:
            db.execute(sql)
        except sqlite3.IntegrityError:
            db.execute('ROLLBACK TO invalid_case')
        else:
            raise AssertionError(f'Invalid mutation accepted: {sql}')
        finally:
            db.execute('RELEASE invalid_case')
    return counts

def build(path):
    path.parent.mkdir(parents=True,exist_ok=True)
    # Build atomically so a failed validation never overwrites a usable catalog.
    with tempfile.TemporaryDirectory(dir=path.parent) as directory:
        pending=Path(directory)/'catalog.sqlite'
        with closing(sqlite3.connect(pending)) as db:
            seed(db)
            counts=validate(db)
        pending.replace(path)
    return counts

def export():
    with closing(sqlite3.connect(':memory:')) as db:
        seed(db)
        sql='\n'.join(db.iterdump())+'\n'
    # SQLite dump includes schema; the PostgreSQL file below is a separate catalog
    # schema and intentionally never overwrites public.recipes or public.vegetables.
    (DATA/'seed.sql').write_text(sql,encoding='utf-8')
    schema=(DATA/'schema.sql').read_text(encoding='utf-8').replace('PRAGMA foreign_keys = ON;','')
    import re
    schema=re.sub(r'CHECK\(json_valid\((\w+)\)\)',r"CHECK(jsonb_typeof(\1::jsonb)='array')",schema)
    schema=schema.replace(' REAL',' DOUBLE PRECISION')
    pg='BEGIN;\nCREATE SCHEMA food_catalog;\nSET LOCAL search_path=food_catalog,public;\n'+schema
    # Single transaction; reruns fail instead of silently duplicating or deleting data.
    for table in ORDER:
        for row in rows(table):
            def quote(v):
                v=scalar(v)
                if v is None:return 'NULL'
                if isinstance(v,bool):return str(int(v))
                if isinstance(v,(float,int)):return str(v)
                return "'"+str(v).replace("'","''")+"'"
            pg+=f'INSERT INTO {table} ({",".join(row)}) VALUES ({",".join(quote(v) for v in row.values())});\n'
    for table in ORDER:pg+=f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;\n'
    pg+='REVOKE ALL ON SCHEMA food_catalog FROM PUBLIC, anon, authenticated;\nCOMMIT;\n'
    (DATA/'postgres.sql').write_text(pg,encoding='utf-8')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['build','validate','export'])
    parser.add_argument('--output',type=Path,default=ROOT/'var/food-catalog/catalog.sqlite')
    args=parser.parse_args()
    if args.command=='export':export();print('SQL exports generated');return
    if args.command=='build':print(json.dumps(build(args.output),ensure_ascii=False));return
    with closing(sqlite3.connect(args.output.resolve().as_uri()+'?mode=ro', uri=True)) as db:
        with closing(sqlite3.connect(':memory:')) as check:
            db.backup(check)
            check.execute('PRAGMA foreign_keys=ON')
            print(json.dumps(validate(check),ensure_ascii=False))

if __name__=='__main__':main()
