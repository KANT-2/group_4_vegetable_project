"""Create/rename the two requested development accounts without embedding passwords.

Set DEMO_CUSTOMER_PASSWORD and DEMO_ADMIN_PASSWORD for this process only.
Existing accounts are renamed only after their current password/role matches.
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from app.application.accounts.security import verify_password
from app.core.config import get_settings
from app.domain.accounts.models import UserRole
from scripts.create_user import create_user


async def main():
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    try:
        for username, email, role, nickname, env_key in [
            ("qwer", "qwer@naver.com", UserRole.USER, "qwer", "DEMO_CUSTOMER_PASSWORD"),
            ("admin", "admin@naver.com", UserRole.ADMIN, "관리자", "DEMO_ADMIN_PASSWORD"),
        ]:
            password = os.environ.get(env_key)
            if not password:
                raise SystemExit(f"Set {env_key} before running.")
            async with AsyncSession(engine, expire_on_commit=False) as session:
                rows = (await session.execute(text("SELECT id,email,role,password_hash FROM app_users WHERE email=:email OR username=:username"), {"email": email, "username": username})).mappings().all()
                if not rows:
                    await create_user(session, email, password, nickname, role, username)
                    print(f"created: {email} ({role.value})")
                else:
                    if len(rows) != 1 or rows[0]["role"] != role.value or not verify_password(password, rows[0]["password_hash"]):
                        raise SystemExit(f"Account conflict: {email}; no password or role was changed.")
                    await session.execute(text("UPDATE app_users SET email=:email WHERE id=:id"), {"email": email, "id": rows[0]["id"]})
                    await session.execute(text("UPDATE auth.users SET email=:email WHERE id=:id"), {"email": email, "id": rows[0]["id"]})
                    await session.commit()
                    print(f"ready: {email} ({role.value})")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
