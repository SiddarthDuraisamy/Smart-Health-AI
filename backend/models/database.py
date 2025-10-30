"""
Database initialization and schema setup
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from database.connection import get_database
import logging

logger = logging.getLogger(__name__)

async def init_db():
    """Initialize database with indexes and constraints"""
    try:
        db: AsyncIOMotorDatabase = await get_database()
        
        # Users collection indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("role")
        
        # Patients collection indexes
        await db.patients.create_index("user_id", unique=True)
        await db.patients.create_index("medical_record_number", unique=True)
        
        # Doctors collection indexes
        await db.doctors.create_index("user_id", unique=True)
        await db.doctors.create_index("license_number", unique=True)
        await db.doctors.create_index("specializations")
        
        # Consultations collection indexes
        await db.consultations.create_index("patient_id")
        await db.consultations.create_index("doctor_id")
        await db.consultations.create_index("scheduled_at")
        await db.consultations.create_index("status")
        
        # Health records collection indexes
        await db.health_records.create_index("patient_id")
        await db.health_records.create_index("record_type")
        await db.health_records.create_index("created_at")
        
        # AI predictions collection indexes
        await db.ai_predictions.create_index("patient_id")
        await db.ai_predictions.create_index("prediction_type")
        await db.ai_predictions.create_index("created_at")
        
        # Blockchain ledger collection indexes
        await db.blockchain_ledger.create_index("transaction_hash", unique=True)
        await db.blockchain_ledger.create_index("patient_id")
        await db.blockchain_ledger.create_index("timestamp")
        
        logger.info("Database initialized successfully with indexes")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise e
