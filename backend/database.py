from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration - use Neon PostgreSQL in production, SQLite locally
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/chroni_companion.db")

# Create data directory for SQLite if needed 
if DATABASE_URL.startswith("sqlite"):
    os.makedirs("data", exist_ok=True)

# Create SQLAlchemy engine with appropriate settings
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    # PostgreSQL (Neon) configuration
    engine = create_engine(DATABASE_URL, echo=False)
else:
    # SQLite configuration for local development
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False},
        echo=False
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize database tables
def init_db():
    from backend.models import Base
    Base.metadata.create_all(bind=engine) 