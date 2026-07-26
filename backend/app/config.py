import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mediassist.db")
JWT_SECRET = os.getenv("JWT_SECRET", "mediassist_super_secret_key_98765")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
