"""Run with: python -m unittest discover -s tests -p test_food_catalog.py"""
import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from food_catalog import DATA, ORDER, build, seed, validate

class CatalogTests(unittest.TestCase):
    def test_json_and_sql_restore_are_identical(self):
        with closing(sqlite3.connect(':memory:')) as original, closing(sqlite3.connect(':memory:')) as restored:
            seed(original)
            restored.executescript((DATA/'seed.sql').read_text(encoding='utf-8'))
            restored.execute('PRAGMA foreign_keys=ON')
            validate(original)
            validate(restored)
            for table in ORDER:
                self.assertEqual(original.execute(f'SELECT * FROM {table} ORDER BY id').fetchall(),
                                 restored.execute(f'SELECT * FROM {table} ORDER BY id').fetchall(),table)

    def test_rebuild_replaces_snapshot_without_duplicate_rows(self):
        (ROOT/'var/food-catalog').mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT/'var/food-catalog') as directory:
            path=Path(directory)/'catalog.sqlite'
            first=build(path)
            second=build(path)
            self.assertEqual(first,second)
            with closing(sqlite3.connect(path)) as db:
                self.assertEqual(db.execute('SELECT count(*) FROM recipes').fetchone()[0],16)

if __name__=='__main__':unittest.main()
