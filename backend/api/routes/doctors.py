"""
Doctor management routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.user import User, UserRole
from models.doctor import Doctor, DoctorUpdate, Availability
from auth.security import get_current_active_user, require_roles
from database.connection import get_doctors_collection

router = APIRouter()

@router.get("/profile", response_model=Doctor)
async def get_doctor_profile(current_user: User = Depends(get_current_active_user)):
    """Get doctor profile"""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Doctor role required."
        )
    
    doctors_collection = await get_doctors_collection()
    doctor = await doctors_collection.find_one({"user_id": ObjectId(current_user.id)})
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    return Doctor(**doctor)

@router.put("/profile", response_model=Doctor)
async def update_doctor_profile(
    doctor_update: DoctorUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update doctor profile"""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Doctor role required."
        )
    
    doctors_collection = await get_doctors_collection()
    
    # Prepare update data
    update_data = {k: v for k, v in doctor_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        result = await doctors_collection.update_one(
            {"user_id": ObjectId(current_user.id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
    
    # Return updated doctor
    updated_doctor = await doctors_collection.find_one({"user_id": ObjectId(current_user.id)})
    return Doctor(**updated_doctor)

@router.put("/availability", response_model=dict)
async def update_availability(
    availability: List[Availability],
    current_user: User = Depends(get_current_active_user)
):
    """Update doctor's availability schedule"""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Doctor role required."
        )
    
    doctors_collection = await get_doctors_collection()
    
    result = await doctors_collection.update_one(
        {"user_id": ObjectId(current_user.id)},
        {
            "$set": {
                "availability": [avail.dict() for avail in availability],
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    return {"message": "Availability updated successfully"}

@router.get("/search", response_model=List[Doctor])
async def search_doctors(
    specialization: Optional[str] = None,
    min_experience: Optional[int] = None,
    max_fee: Optional[float] = None,
    language: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """Search doctors by criteria"""
    doctors_collection = await get_doctors_collection()
    
    # Build search query
    query = {"is_verified": True}
    
    if specialization:
        query["specializations"] = {"$in": [specialization]}
    
    if min_experience:
        query["years_of_experience"] = {"$gte": min_experience}
    
    if max_fee:
        query["consultation_fee"] = {"$lte": max_fee}
    
    if language:
        query["languages_spoken"] = {"$in": [language]}
    
    cursor = doctors_collection.find(query).skip(skip).limit(limit)
    doctors = await cursor.to_list(length=limit)
    
    return [Doctor(**doctor) for doctor in doctors]

@router.get("/{doctor_id}", response_model=Doctor)
async def get_doctor_by_id(doctor_id: str):
    """Get doctor by ID (public endpoint)"""
    doctors_collection = await get_doctors_collection()
    
    try:
        doctor = await doctors_collection.find_one({
            "_id": ObjectId(doctor_id),
            "is_verified": True
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid doctor ID"
        )
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    return Doctor(**doctor)

@router.get("/", response_model=List[Doctor])
async def list_doctors(
    skip: int = 0,
    limit: int = 50,
    verified_only: bool = True
):
    """List all doctors"""
    doctors_collection = await get_doctors_collection()
    
    query = {}
    if verified_only:
        query["is_verified"] = True
    
    cursor = doctors_collection.find(query).skip(skip).limit(limit)
    doctors = await cursor.to_list(length=limit)
    
    return [Doctor(**doctor) for doctor in doctors]

@router.post("/{doctor_id}/verify", response_model=dict)
async def verify_doctor(
    doctor_id: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """Verify doctor (admin only)"""
    doctors_collection = await get_doctors_collection()
    
    try:
        result = await doctors_collection.update_one(
            {"_id": ObjectId(doctor_id)},
            {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid doctor ID"
        )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    return {"message": "Doctor verified successfully"}
