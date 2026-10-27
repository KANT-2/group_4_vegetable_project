from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "sql-drafts"
    / "202610260001_accounts.sql"
)


def migration_sql() -> str:
    return MIGRATION.read_text(encoding="utf-8").lower()


def test_accounts_migration_creates_owned_tables():
    sql = migration_sql()

    assert "create table public.app_users" in sql
    assert "id uuid primary key references auth.users(id)" in sql
    assert "username text unique" in sql
    assert "create table public.revoked_tokens" in sql
    assert "create table public.admin_registrations" in sql
    assert "id uuid primary key references auth.users(id)" in sql
    assert "username_key text generated always as (lower(username))" in sql
    assert "email_key text generated always as (lower(btrim(email)))" in sql
    assert "status in ('pending', 'approved', 'rejected')" in sql


def test_accounts_migration_does_not_change_other_members_foreign_keys():
    sql = migration_sql()

    for table in (
        "profiles",
        "cart_items",
        "wishlist_items",
        "orders",
        "user_coupons",
    ):
        assert f"alter table public.{table}" not in sql


def test_accounts_migration_uses_existing_auth_user_identity():
    sql = migration_sql()

    assert "supabase_user_id uuid not null unique references auth.users(id)" in sql
    assert "check (id = supabase_user_id)" in sql
    assert "default gen_random_uuid()" not in sql.split(
        "create table public.app_users", 1
    )[1].split(");", 1)[0]
