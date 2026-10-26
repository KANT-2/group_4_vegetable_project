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
    assert "create table public.revoked_tokens" in sql
    assert "references public.app_users(id)" in sql


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
