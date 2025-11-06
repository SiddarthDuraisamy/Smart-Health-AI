"""
Smart Health Consulting Services - Main FastAPI Application
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
import os

# Load environment variables FIRST
load_dotenv()

from api.routes import auth, patients, doctors, consultations, analytics, users, notifications, health_records, medications
from api.routes import ai_assistant as ai, chat_websocket
from database.connection import connect_to_mongo, close_mongo_connection
from models.database import init_db

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if os.getenv("SKIP_DATABASE") == "true":
        print("⚠️ Database connection skipped (SKIP_DATABASE=true)")
        print("🤖 AI features will still work")
        print("📝 Database-dependent features will be disabled")
    else:
        try:
            import asyncio
            # Add timeout to database connection
            await asyncio.wait_for(connect_to_mongo(), timeout=10.0)
            await asyncio.wait_for(init_db(), timeout=5.0)
            print("✅ Database connected successfully")
        except asyncio.TimeoutError:
            print("⚠️ Database connection timeout - starting without database")
            print("📝 API will run with limited functionality")
        except Exception as e:
            print(f"⚠️ Database connection failed: {e}")
            print("📝 API will run without database functionality")
    yield
    # Shutdown
    if os.getenv("SKIP_DATABASE") != "true":
        try:
            await close_mongo_connection()
        except Exception as e:
            print(f"Warning: Database disconnect error: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="Smart Health Consulting Services API",
    description="AI-Driven Healthcare Platform with Personalized Medical Consulting",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware - Maximum permissive for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False with allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests
)

# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Smart Health Consulting Services API",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "Smart Health API"}

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["patients"])
app.include_router(doctors.router, prefix="/api/v1/doctors", tags=["doctors"])
app.include_router(consultations.router, prefix="/api/v1/consultations", tags=["consultations"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(health_records.router, prefix="/api/v1/health-records", tags=["health-records"])
app.include_router(medications.router, prefix="/api/v1/medications", tags=["medications"])
# AI and Analytics routes
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
# WebSocket chat
app.include_router(chat_websocket.router, prefix="/api/v1/ws", tags=["WebSocket Chat"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
