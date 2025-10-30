"""
Patient management routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.user import User, UserRole
from models.patient import Patient, PatientUpdate, VitalSigns, LifestyleData
from auth.security import get_current_active_user, require_roles
from database.connection import get_patients_collection, get_users_collection

router = APIRouter()

@router.get("/profile", response_model=Patient)
async def get_patient_profile(current_user: User = Depends(get_current_active_user)):
    """Get patient profile"""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient role required."
        )
    
    patients_collection = await get_patients_collection()
    patient = await patients_collection.find_one({"user_id": ObjectId(current_user.id)})
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    return Patient(**patient)

@router.put("/profile", response_model=Patient)
async def update_patient_profile(
    patient_update: PatientUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update patient profile"""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient role required."
        )
    
    patients_collection = await get_patients_collection()
    
    # Prepare update data
    update_data = {k: v for k, v in patient_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        result = await patients_collection.update_one(
            {"user_id": ObjectId(current_user.id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found"
            )
    
    # Return updated patient
    updated_patient = await patients_collection.find_one({"user_id": ObjectId(current_user.id)})
    return Patient(**updated_patient)

@router.post("/vital-signs", response_model=dict)
async def add_vital_signs(
    vital_signs: VitalSigns,
    current_user: User = Depends(get_current_active_user)
):
    """Add new vital signs reading"""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient role required."
        )
    
    patients_collection = await get_patients_collection()
    
    result = await patients_collection.update_one(
        {"user_id": ObjectId(current_user.id)},
        {
            "$push": {"vital_signs_history": vital_signs.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    return {"message": "Vital signs added successfully"}

@router.get("/vital-signs", response_model=List[VitalSigns])
async def get_vital_signs_history(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
):
    """Get patient's vital signs history"""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient role required."
        )
    
    patients_collection = await get_patients_collection()
    patient = await patients_collection.find_one({"user_id": ObjectId(current_user.id)})
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    vital_signs = patient.get("vital_signs_history", [])
    # Sort by timestamp descending and limit results
    vital_signs.sort(key=lambda x: x.get("timestamp"), reverse=True)
    
    return [VitalSigns(**vs) for vs in vital_signs[:limit]]

@router.put("/lifestyle", response_model=dict)
async def update_lifestyle_data(
    lifestyle_data: LifestyleData,
    current_user: User = Depends(get_current_active_user)
):
    """Update patient's lifestyle data"""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient role required."
        )
    
    patients_collection = await get_patients_collection()
    
    result = await patients_collection.update_one(
        {"user_id": ObjectId(current_user.id)},
        {
            "$set": {
                "lifestyle_data": lifestyle_data.dict(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    
    return {"message": "Lifestyle data updated successfully"}

@router.get("/{patient_id}", response_model=Patient)
async def get_patient_by_id(
    patient_id: str,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Get patient by ID (doctors and admins only)"""
    patients_collection = await get_patients_collection()
    
    try:
        patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient ID"
        )
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    return Patient(**patient)

@router.get("/", response_model=List[Patient])
async def list_patients(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """List all patients (doctors and admins only)"""
    patients_collection = await get_patients_collection()
    
    cursor = patients_collection.find().skip(skip).limit(limit)
    patients = await cursor.to_list(length=limit)
    
    return [Patient(**patient) for patient in patients]
