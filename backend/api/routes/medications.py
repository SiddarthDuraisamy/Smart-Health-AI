from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from datetime import datetime, time
from pydantic import BaseModel, Field
from bson import ObjectId
from database.connection import get_database
from auth.security import get_current_user
from models.user import User
from enum import Enum

router = APIRouter(tags=["medications"])

class MedicationFrequency(str, Enum):
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    AS_NEEDED = "as_needed"
    WEEKLY = "weekly"
    CUSTOM = "custom"

class MedicationStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    DISCONTINUED = "discontinued"

class Medication(BaseModel):
    name: str = Field(..., description="Medication name")
    dosage: str = Field(..., description="Dosage (e.g., '500mg', '1 tablet')")
    frequency: MedicationFrequency = Field(..., description="How often to take")
    instructions: Optional[str] = Field(None, description="Special instructions (e.g., 'Take with food')")
    start_date: datetime = Field(default_factory=datetime.now, description="When to start taking")
    end_date: Optional[datetime] = Field(None, description="When to stop (optional)")
    reminder_times: List[str] = Field(default_factory=list, description="Reminder times in HH:MM format")
    status: MedicationStatus = Field(default=MedicationStatus.ACTIVE, description="Current status")
    notes: Optional[str] = Field(None, description="Additional notes")
    prescribing_doctor: Optional[str] = Field(None, description="Doctor who prescribed")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class MedicationResponse(Medication):
    id: str
    user_id: str

class MedicationLog(BaseModel):
    medication_id: str
    taken_at: datetime = Field(default_factory=datetime.now)
    scheduled_time: Optional[str] = Field(None, description="Original scheduled time")
    notes: Optional[str] = Field(None, description="Notes about this dose")

class MedicationLogResponse(MedicationLog):
    id: str
    user_id: str
    medication_name: str

def get_default_reminder_times(frequency: MedicationFrequency) -> List[str]:
    """Get default reminder times based on frequency"""
    defaults = {
        MedicationFrequency.ONCE_DAILY: ["08:00"],
        MedicationFrequency.TWICE_DAILY: ["08:00", "20:00"],
        MedicationFrequency.THREE_TIMES_DAILY: ["08:00", "14:00", "20:00"],
        MedicationFrequency.FOUR_TIMES_DAILY: ["08:00", "12:00", "16:00", "20:00"],
        MedicationFrequency.AS_NEEDED: [],
        MedicationFrequency.WEEKLY: ["08:00"],
        MedicationFrequency.CUSTOM: []
    }
    return defaults.get(frequency, [])

@router.post("/", response_model=MedicationResponse)
async def create_medication(
    medication: Medication,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new medication"""
    
    # Set default reminder times if not provided
    if not medication.reminder_times:
        medication.reminder_times = get_default_reminder_times(medication.frequency)
    
    # Prepare document for insertion
    medication_dict = medication.dict()
    medication_dict["user_id"] = ObjectId(current_user.id)
    
    # Insert into database
    result = await db.medications.insert_one(medication_dict)
    
    # Return the created medication
    created_medication = await db.medications.find_one({"_id": result.inserted_id})
    created_medication["id"] = str(created_medication["_id"])
    created_medication["user_id"] = str(created_medication["user_id"])
    
    return MedicationResponse(**created_medication)

@router.get("/", response_model=List[MedicationResponse])
async def get_medications(
    status: Optional[MedicationStatus] = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all medications for the current user"""
    
    query = {"user_id": ObjectId(current_user.id)}
    if status:
        query["status"] = status
    
    cursor = db.medications.find(query).sort("created_at", -1)
    
    medications = []
    async for medication in cursor:
        medication["id"] = str(medication["_id"])
        medication["user_id"] = str(medication["user_id"])
        medications.append(MedicationResponse(**medication))
    
    return medications

@router.get("/active", response_model=List[MedicationResponse])
async def get_active_medications(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get only active medications for the current user"""
    
    query = {
        "user_id": ObjectId(current_user.id),
        "status": MedicationStatus.ACTIVE
    }
    
    cursor = db.medications.find(query).sort("created_at", -1)
    
    medications = []
    async for medication in cursor:
        medication["id"] = str(medication["_id"])
        medication["user_id"] = str(medication["user_id"])
        medications.append(MedicationResponse(**medication))
    
    return medications

@router.get("/reminders")
async def get_todays_reminders(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get today's medication reminders"""
    
    # Get active medications
    medications = await db.medications.find({
        "user_id": ObjectId(current_user.id),
        "status": MedicationStatus.ACTIVE
    }).to_list(length=None)
    
    # Get today's logs to check what's been taken
    today = datetime.now().date()
    logs = await db.medication_logs.find({
        "user_id": ObjectId(current_user.id),
        "taken_at": {
            "$gte": datetime.combine(today, time.min),
            "$lt": datetime.combine(today, time.max)
        }
    }).to_list(length=None)
    
    # Create a set of taken medication_id + time combinations
    taken_today = set()
    for log in logs:
        if log.get("scheduled_time"):
            taken_today.add(f"{log['medication_id']}_{log['scheduled_time']}")
    
    reminders = []
    current_time = datetime.now().time()
    
    for med in medications:
        med["id"] = str(med["_id"])
        for reminder_time in med.get("reminder_times", []):
            reminder_key = f"{med['_id']}_{reminder_time}"
            is_taken = reminder_key in taken_today
            
            # Parse reminder time
            try:
                reminder_hour, reminder_minute = map(int, reminder_time.split(":"))
                reminder_time_obj = time(reminder_hour, reminder_minute)
                is_due = current_time >= reminder_time_obj
            except:
                is_due = False
            
            reminders.append({
                "medication_id": str(med["_id"]),
                "medication_name": med["name"],
                "dosage": med["dosage"],
                "instructions": med.get("instructions"),
                "reminder_time": reminder_time,
                "is_taken": is_taken,
                "is_due": is_due and not is_taken,
                "status": "taken" if is_taken else ("due" if is_due else "upcoming")
            })
    
    # Sort by time
    reminders.sort(key=lambda x: x["reminder_time"])
    
    return {"reminders": reminders, "total": len(reminders)}

@router.put("/{medication_id}", response_model=MedicationResponse)
async def update_medication(
    medication_id: str,
    medication_update: Medication,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update a medication"""
    
    medication_update.updated_at = datetime.now()
    
    result = await db.medications.update_one(
        {
            "_id": ObjectId(medication_id),
            "user_id": ObjectId(current_user["_id"])
        },
        {"$set": medication_update.dict(exclude_unset=True)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found"
        )
    
    # Return updated medication
    updated_medication = await db.medications.find_one({"_id": ObjectId(medication_id)})
    updated_medication["id"] = str(updated_medication["_id"])
    updated_medication["user_id"] = str(updated_medication["user_id"])
    
    return MedicationResponse(**updated_medication)

@router.patch("/{medication_id}/status")
async def update_medication_status(
    medication_id: str,
    status: MedicationStatus,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update medication status (active, paused, completed, discontinued)"""
    
    result = await db.medications.update_one(
        {
            "_id": ObjectId(medication_id),
            "user_id": ObjectId(current_user["_id"])
        },
        {
            "$set": {
                "status": status,
                "updated_at": datetime.now()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found"
        )
    
    return {"message": f"Medication status updated to {status}"}

@router.delete("/{medication_id}")
async def delete_medication(
    medication_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a medication"""
    
    result = await db.medications.delete_one({
        "_id": ObjectId(medication_id),
        "user_id": ObjectId(current_user.id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found"
        )
    
    # Also delete related logs
    await db.medication_logs.delete_many({
        "medication_id": medication_id,
        "user_id": ObjectId(current_user.id)
    })
    
    return {"message": "Medication deleted successfully"}

# Medication Logging Endpoints

@router.post("/{medication_id}/log", response_model=MedicationLogResponse)
async def log_medication_taken(
    medication_id: str,
    log_data: MedicationLog,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Log that a medication was taken"""
    
    # Verify medication exists and belongs to user
    medication = await db.medications.find_one({
        "_id": ObjectId(medication_id),
        "user_id": ObjectId(current_user.id)
    })
    
    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found"
        )
    
    # Prepare log document
    log_dict = log_data.dict()
    log_dict["medication_id"] = medication_id
    log_dict["user_id"] = ObjectId(current_user.id)
    log_dict["medication_name"] = medication["name"]
    
    # Insert log
    result = await db.medication_logs.insert_one(log_dict)
    
    # Return created log
    created_log = await db.medication_logs.find_one({"_id": result.inserted_id})
    created_log["id"] = str(created_log["_id"])
    created_log["user_id"] = str(created_log["user_id"])
    
    return MedicationLogResponse(**created_log)

@router.get("/{medication_id}/logs", response_model=List[MedicationLogResponse])
async def get_medication_logs(
    medication_id: str,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get medication logs for a specific medication"""
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date.replace(day=end_date.day - days) if days else datetime.min
    
    cursor = db.medication_logs.find({
        "medication_id": medication_id,
        "user_id": ObjectId(current_user.id),
        "taken_at": {"$gte": start_date, "$lte": end_date}
    }).sort("taken_at", -1)
    
    logs = []
    async for log in cursor:
        log["id"] = str(log["_id"])
        log["user_id"] = str(log["user_id"])
        logs.append(MedicationLogResponse(**log))
    
    return logs

@router.post("/{medication_id}/mark-taken")
async def mark_medication_taken(
    medication_id: str,
    scheduled_time: Optional[str] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Quick endpoint to mark a medication as taken"""
    
    log_data = MedicationLog(
        medication_id=medication_id,
        scheduled_time=scheduled_time,
        notes=notes
    )
    
    return await log_medication_taken(medication_id, log_data, current_user, db)
