from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# We must percent-encode the # symbol as %23 for the connection string
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres.dbelmiceyijuogyuhlvb:kETANARYAN%231@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"

# For Postgres, we don't need check_same_thread
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
