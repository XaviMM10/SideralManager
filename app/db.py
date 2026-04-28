from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "postgresql+psycopg://office_user:0000@localhost/office_db" #The address SQLAlchemy uses to connect to PostgreSQL

class Base(DeclarativeBase): #Common parent for all tables
    pass

engine = create_engine(DATABASE_URL, echo=True) #Connection machinery 

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False) #To do things with rows

def get_db(): #Opens a session and closes it afterwards. Modifications must be done inside a session
    db = SessionLocal()
    try:
        yield db #create resource, use it and clean up
    finally:
        db.close()