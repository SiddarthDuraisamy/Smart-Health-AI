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

from api.routes import auth, patients, doctors, consultations
from database.connection import connect_to_mongo, close_mongo_connection
from models.database import init_db

# Load environment variables
load_dotenv()

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    await init_db()
    yield
    # Shutdown
    await close_mongo_connection()

# Initialize FastAPI app
app = FastAPI(
    title="Smart Health Consulting Services API",
    description="AI-Driven Healthcare Platform with Personalized Medical Consulting",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(doctors.router, prefix="/api/doctors", tags=["doctors"])
app.include_router(consultations.router, prefix="/api/consultations", tags=["consultations"])
# AI and Analytics routes temporarily disabled due to ML dependencies
# app.include_router(ai_assistant.router, prefix="/api/v1/ai", tags=["AI Assistant"])
# app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
