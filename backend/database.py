import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# We must percent-encode the # symbol as %23 for the connection string
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres.dbelmiceyijuogyuhlvb:kETANARYAN%231@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"
)

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temple_queue.db")
SQLITE_URL = f"sqlite:///{db_path}"

try:
    # Try connecting to PostgreSQL / Supabase
    temp_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"connect_timeout": 10})
    with temp_engine.connect() as conn:
        pass
    engine = temp_engine
    print("Database: Connected to Supabase PostgreSQL.")
except Exception as e:
    print(f"Database: Supabase unavailable ({e}). Using local SQLite database.")
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
