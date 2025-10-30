"""
Database connection management for MongoDB
"""

import os
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
        db.client = AsyncIOMotorClient(
            os.getenv("MONGODB_URL", "mongodb://localhost:27017/smart_health_db"),
            maxPoolSize=10,
            minPoolSize=10,
        )
        
        # Extract database name from URL or use default
        db_name = os.getenv("MONGODB_URL", "mongodb://localhost:27017/smart_health_db").split("/")[-1]
        if "?" in db_name:
            db_name = db_name.split("?")[0]
        
        db.database = db.client[db_name]
        
        # Test the connection
        await db.client.admin.command('ping')
        logger.info(f"Connected to MongoDB database: {db_name}")
        
    except ConnectionFailure as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

# Collection getters
async def get_users_collection():
    database = await get_database()
    return database.users

async def get_patients_collection():
    database = await get_database()
    return database.patients

async def get_doctors_collection():
    database = await get_database()
    return database.doctors

async def get_consultations_collection():
    database = await get_database()
    return database.consultations

async def get_health_records_collection():
    database = await get_database()
    return database.health_records

async def get_ai_predictions_collection():
    database = await get_database()
    return database.ai_predictions

async def get_blockchain_ledger_collection():
    database = await get_database()
    return database.blockchain_ledger
