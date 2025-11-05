"""
Patient management routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.user import User, UserRole
from models.patient import Patient, PatientCreate, PatientUpdate, VitalSigns, LifestyleData, PatientInDB, EmergencyContact
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
    users_collection = await get_users_collection()
    
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
    
    # Check if corresponding user account exists and enrich with user data
    user_data = await users_collection.find_one({"_id": patient["user_id"]})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient's user account not found"
        )
    
    # Enrich patient data with user information
    enriched_patient = {**patient}
    enriched_patient["user_info"] = {
        "full_name": user_data.get("full_name"),
        "email": user_data.get("email"),
        "phone": user_data.get("phone"),
        "date_of_birth": user_data.get("date_of_birth"),
        "address": user_data.get("address")
    }
    
    return enriched_patient

@router.post("/", response_model=dict)
async def create_patient(
    patient_data: dict,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Create a new patient profile (doctors and admins only)"""
    patients_collection = await get_patients_collection()
    
    try:
        # Check if patient profile already exists for this user
        existing_patient = await patients_collection.find_one({"user_id": ObjectId(patient_data["user_id"])})
        if existing_patient:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Patient profile already exists for this user"
            )
        
        # Generate medical record number
        import random
        import string
        mrn = "MRN" + "".join(random.choices(string.digits, k=8))
        
        # Process emergency contacts properly
        emergency_contacts = []
        if patient_data.get("emergency_contacts") and len(patient_data["emergency_contacts"]) > 0:
            for contact in patient_data["emergency_contacts"]:
                if isinstance(contact, dict) and contact.get("name"):
                    emergency_contacts.append({
                        "name": str(contact.get("name", "")),
                        "phone": str(contact.get("phone", "")),
                        "relationship": str(contact.get("relationship", ""))
                    })
        
        # Process allergies and medical history as strings, not arrays
        allergies_list = []
        if patient_data.get("allergies") and isinstance(patient_data["allergies"], list):
            allergies_list = [str(allergy) for allergy in patient_data["allergies"] if allergy]
        
        medical_history_list = []
        if patient_data.get("medical_history") and isinstance(patient_data["medical_history"], list):
            medical_history_list = [str(history) for history in patient_data["medical_history"] if history]
        
        # Create patient document with only non-empty fields
        patient_doc = {
            "user_id": ObjectId(patient_data["user_id"]),
            "medical_record_number": str(mrn),
            "gender": str(patient_data.get("gender", "male")),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Only add fields that have actual data
        if patient_data.get("blood_type") and patient_data["blood_type"].strip():
            patient_doc["blood_type"] = str(patient_data["blood_type"])
            
        if emergency_contacts:
            patient_doc["emergency_contacts"] = emergency_contacts
            
        if medical_history_list:
            patient_doc["medical_history"] = medical_history_list
            
        if allergies_list:
            patient_doc["allergies"] = allergies_list
        
        result = await patients_collection.insert_one(patient_doc)
        
        return {
            "message": "Patient created successfully",
            "patient_id": str(result.inserted_id),
            "medical_record_number": mrn
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating patient: {str(e)}"
        )

@router.post("/fix-orphaned", response_model=dict)
async def fix_orphaned_patients(
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Fix orphaned patients by creating missing user accounts (admin only)"""
    from auth.security import get_password_hash
    
    patients_collection = await get_patients_collection()
    users_collection = await get_users_collection()
    
    # Get all patients
    patients = await patients_collection.find().to_list(length=None)
    
    fixed_count = 0
    for patient in patients:
        user_data = await users_collection.find_one({"_id": patient["user_id"]})
        if not user_data:
            # Create missing user account
            user_doc = {
                "_id": patient["user_id"],
                "email": f"patient_{patient.get('medical_record_number', 'unknown')}@temp.com",
                "full_name": f"Patient {patient.get('medical_record_number', 'Unknown')}",
                "role": "patient",
                "hashed_password": get_password_hash("temppassword123"),
                "is_active": True,
                "phone": "+1234567890",
                "date_of_birth": datetime(1990, 1, 1),
                "address": "Address not provided",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": None
            }
            
            await users_collection.insert_one(user_doc)
            fixed_count += 1
            print(f"✅ Created user account for patient {patient.get('medical_record_number')}")
    
    return {
        "message": f"Fixed {fixed_count} orphaned patients",
        "fixed_count": fixed_count
    }

@router.get("/", response_model=List[Patient])
async def list_patients(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """List all patients (doctors and admins only)"""
    patients_collection = await get_patients_collection()
    users_collection = await get_users_collection()
    
    # Get all patients
    cursor = patients_collection.find().skip(skip).limit(limit)
    patients = await cursor.to_list(length=limit)
    
    # Filter out patients whose user accounts don't exist and enrich with user data
    valid_patients = []
    for patient in patients:
        user_data = await users_collection.find_one({"_id": patient["user_id"]})
        if user_data:
            # Enrich patient data with user information
            enriched_patient = {**patient}
            enriched_patient["user_info"] = {
                "full_name": user_data.get("full_name"),
                "email": user_data.get("email"),
                "phone": user_data.get("phone"),
                "date_of_birth": user_data.get("date_of_birth"),
                "address": user_data.get("address")
            }

            valid_patients.append(enriched_patient)
        else:
            # Optionally log or clean up orphaned patient records
            print(f"Warning: Patient {patient.get('_id')} has no corresponding user account")
    
    return valid_patients
