"""
Consultation management routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.user import User, UserRole
from models.consultation import (
    Consultation, ConsultationCreate, ConsultationUpdate, 
    ChatMessage, Diagnosis, Treatment, AIInsight
)
from auth.security import get_current_active_user, require_roles
from database.connection import get_consultations_collection

router = APIRouter()

@router.post("/", response_model=Consultation)
async def create_consultation(
    consultation_data: ConsultationCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create new consultation"""
    if current_user.role == UserRole.PATIENT:
        # Patients can only create consultations for themselves
        consultation_data.patient_id = ObjectId(current_user.id)
    elif current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    consultations_collection = await get_consultations_collection()
    
    consultation_dict = consultation_data.dict()
    consultation_dict["created_at"] = datetime.utcnow()
    consultation_dict["updated_at"] = datetime.utcnow()
    
    result = await consultations_collection.insert_one(consultation_dict)
    consultation_dict["_id"] = result.inserted_id
    
    return Consultation(**consultation_dict)

@router.get("/my-consultations", response_model=List[Consultation])
async def get_my_consultations(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """Get user's consultations"""
    consultations_collection = await get_consultations_collection()
    
    if current_user.role == UserRole.PATIENT:
        query = {"patient_id": ObjectId(current_user.id)}
    elif current_user.role == UserRole.DOCTOR:
        query = {"doctor_id": ObjectId(current_user.id)}
    else:
        query = {}  # Admin can see all
    
    cursor = consultations_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    consultations = await cursor.to_list(length=limit)
    
    return [Consultation(**consultation) for consultation in consultations]

@router.get("/{consultation_id}", response_model=Consultation)
async def get_consultation(
    consultation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get consultation by ID"""
    consultations_collection = await get_consultations_collection()
    
    try:
        consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consultation ID"
        )
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    # Check access permissions
    if current_user.role == UserRole.PATIENT:
        if consultation["patient_id"] != ObjectId(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.role == UserRole.DOCTOR:
        if consultation.get("doctor_id") != ObjectId(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return Consultation(**consultation)

@router.put("/{consultation_id}", response_model=Consultation)
async def update_consultation(
    consultation_id: str,
    consultation_update: ConsultationUpdate,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Update consultation"""
    consultations_collection = await get_consultations_collection()
    
    update_data = {k: v for k, v in consultation_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        try:
            result = await consultations_collection.update_one(
                {"_id": ObjectId(consultation_id)},
                {"$set": update_data}
            )
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid consultation ID"
            )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation not found"
            )
    
    updated_consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
    return Consultation(**updated_consultation)

@router.post("/{consultation_id}/messages", response_model=dict)
async def add_chat_message(
    consultation_id: str,
    message: ChatMessage,
    current_user: User = Depends(get_current_active_user)
):
    """Add chat message to consultation"""
    consultations_collection = await get_consultations_collection()
    
    # Set sender based on current user
    if current_user.role == UserRole.PATIENT:
        message.sender = str(current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        message.sender = str(current_user.id)
    
    try:
        result = await consultations_collection.update_one(
            {"_id": ObjectId(consultation_id)},
            {
                "$push": {"chat_messages": message.dict()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consultation ID"
        )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    return {"message": "Chat message added successfully"}

@router.post("/{consultation_id}/diagnoses", response_model=dict)
async def add_diagnosis(
    consultation_id: str,
    diagnosis: Diagnosis,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Add diagnosis to consultation"""
    consultations_collection = await get_consultations_collection()
    
    diagnosis.suggested_by = str(current_user.id)
    
    try:
        result = await consultations_collection.update_one(
            {"_id": ObjectId(consultation_id)},
            {
                "$push": {"diagnoses": diagnosis.dict()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consultation ID"
        )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    return {"message": "Diagnosis added successfully"}

@router.post("/{consultation_id}/treatments", response_model=dict)
async def add_treatment(
    consultation_id: str,
    treatment: Treatment,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Add treatment to consultation"""
    consultations_collection = await get_consultations_collection()
    
    treatment.prescribed_by = str(current_user.id)
    
    try:
        result = await consultations_collection.update_one(
            {"_id": ObjectId(consultation_id)},
            {
                "$push": {"treatments": treatment.dict()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consultation ID"
        )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    return {"message": "Treatment added successfully"}

@router.post("/{consultation_id}/ai-insights", response_model=dict)
async def add_ai_insight(
    consultation_id: str,
    ai_insight: AIInsight,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Add AI insight to consultation"""
    consultations_collection = await get_consultations_collection()
    
    try:
        result = await consultations_collection.update_one(
            {"_id": ObjectId(consultation_id)},
            {
                "$push": {"ai_insights": ai_insight.dict()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consultation ID"
        )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    return {"message": "AI insight added successfully"}
