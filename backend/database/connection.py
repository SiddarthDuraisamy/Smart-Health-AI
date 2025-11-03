"""
Database connection management for MongoDB
"""

import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def get_database():
    return db.database

async def connect_to_mongo():
    """Create database connection"""
    try:
        # Get MongoDB URL from environment or use default
        mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/smart_health_db")
        
        # Create MongoDB client with connection timeouts
        db.client = AsyncIOMotorClient(
            mongodb_url,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000,          # 5 second connection timeout
            socketTimeoutMS=5000,           # 5 second socket timeout
            maxPoolSize=10,                 # Limit connection pool
            retryWrites=True
        )
        
        # Extract database name from URL or use default
        db_name = os.getenv("MONGODB_URL", "mongodb://localhost:27017/smart_health_db").split("/")[-1]
        if "?" in db_name:
            db_name = db_name.split("?")[0]
        
        db.database = db.client[db_name]
        
        # Test the connection with timeout
        await asyncio.wait_for(db.client.admin.command('ping'), timeout=5.0)
        logger.info(f"Connected to MongoDB database: {db_name}")
        
    except asyncio.TimeoutError:
        logger.error("MongoDB connection timeout")
        raise ConnectionFailure("Database connection timeout")
    except ConnectionFailure as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected database error: {e}")
        raise ConnectionFailure(f"Database connection failed: {e}")

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

# Collection getters
async def get_users_collection():
    database = await get_database()
    if database is None:
        raise Exception("Database not available - check connection")
    return database.users

async def get_patients_collection():
    database = await get_database()
    if database is None:
        raise Exception("Database not available - check connection")
    return database.patients

async def get_doctors_collection():
    database = await get_database()
    if database is None:
        raise Exception("Database not available - check connection")
    return database.doctors

async def get_consultations_collection():
    database = await get_database()
    if database is None:
        raise Exception("Database not available - check connection")
    return database.consultations

async def get_health_records_collection():
    database = await get_database()
    if database is None:
        raise Exception("Database not available - check connection")
    return database.health_records

async def get_ai_predictions_collection():
    database = await get_database()
    if database is None:
        raise Exception("Database not available - check connection")
    return database.ai_predictions

async def get_blockchain_ledger_collection():
    database = await get_database()
    if database is None:
        raise Exception("Database not available - check connection")
    return database.blockchain_ledger
