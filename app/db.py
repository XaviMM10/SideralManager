import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.engine.url import make_url

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://office_user:0000@localhost:5432/office_db"
)

parsed_url = make_url(DATABASE_URL)

print("DB DEBUG USER:", parsed_url.username)
print("DB DEBUG HOST:", parsed_url.host)
print("DB DEBUG PORT:", parsed_url.port)
print("DB DEBUG DATABASE:", parsed_url.database)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()