from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "202610260003_app_usernames.sql"
)


def test_username_migration_adds_case_insensitive_unique_identifier():
    sql = " ".join(MIGRATION.read_text(encoding="utf-8").lower().split())

    assert "alter table public.app_users add column if not exists username text" in sql
    assert "create unique index app_users_username_key" in sql
    assert "on public.app_users (lower(username))" in sql
    assert "app_users_username_format" in sql
