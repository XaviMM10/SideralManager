import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv(
    "postgresql://postgres.wsfqihjwairfzzvglyuy:securPasword5@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
    "postgresql+psycopg://office_user:0000@localhost/office_db"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

class Base(DeclarativeBase):
    pass