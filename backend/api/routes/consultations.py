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
from database.connection import get_consultations_collection, get_users_collection, get_patients_collection
# Simple notification function to avoid import issues
async def send_patient_notification(patient_email: str, patient_name: str, doctor_name: str, appointment_datetime: str, appointment_type: str, chief_complaint: str) -> bool:
    """Send appointment notification to patient (console logging)"""
    try:
        notification_message = f"""
📧 APPOINTMENT NOTIFICATION
========================
To: {patient_email}
Patient: {patient_name}
Doctor: Dr. {doctor_name}
Date & Time: {appointment_datetime}
Type: {appointment_type}
Reason: {chief_complaint}

Dear {patient_name},

Your appointment has been scheduled with Dr. {doctor_name}.

Appointment Details:
- Date & Time: {appointment_datetime}
- Type: {appointment_type.replace('_', ' ').title()}
- Reason: {chief_complaint}

Please arrive 15 minutes early for your appointment.

Best regards,
Smart Health Team
        """
        print(notification_message)
        return True
    except Exception as e:
        print(f"❌ Error sending notification: {e}")
        return False

router = APIRouter()

def serialize_document(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_document(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            result[key] = serialize_document(value)
        else:
            result[key] = value
    return result

@router.post("/", response_model=dict)
async def create_consultation(
    consultation_data: ConsultationCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create new consultation"""
    try:
        consultations_collection = await get_consultations_collection()
        users_collection = await get_users_collection()
        
        consultation_dict = consultation_data.dict()
        print(f"Received consultation data: {consultation_dict}")
        print(f"Current user: {current_user.email}, Role: {current_user.role}")
        
        if current_user.role == UserRole.PATIENT:
            # Patients can only create consultations for themselves
            consultation_dict["patient_id"] = ObjectId(current_user.id)
        elif current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Ensure patient_id is set
        if not consultation_dict.get("patient_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient ID is required"
            )
        
        # Convert patient_id to ObjectId if it's a string
        if isinstance(consultation_dict["patient_id"], str):
            consultation_dict["patient_id"] = ObjectId(consultation_dict["patient_id"])
        
        # Check if patient_id refers to a patient document or user document
        patients_coll = await get_patients_collection()
        patient_doc = await patients_coll.find_one({"_id": consultation_dict["patient_id"]})
        
        if patient_doc:
            # If it's a patient document ID, use the user_id from that document
            consultation_dict["patient_id"] = patient_doc["user_id"]
            print(f"Found patient document, using user_id: {patient_doc['user_id']}")
        else:
            # If it's already a user_id, keep it as is
            print(f"Using provided patient_id as user_id: {consultation_dict['patient_id']}")
        
        # Set doctor_id if doctor is creating the appointment
        if current_user.role == UserRole.DOCTOR:
            consultation_dict["doctor_id"] = ObjectId(current_user.id)
        
        consultation_dict["created_at"] = datetime.utcnow()
        consultation_dict["updated_at"] = datetime.utcnow()
        
        print(f"Final consultation dict: {consultation_dict}")
        
        result = await consultations_collection.insert_one(consultation_dict)
        consultation_id = result.inserted_id
        
        # Get patient information for notification
        patient = await users_collection.find_one({"_id": consultation_dict["patient_id"]})
        patient_name = patient.get("full_name", "Unknown Patient") if patient else "Unknown Patient"
        patient_email = patient.get("email", "") if patient else ""
        
        # Determine notification type based on who created the consultation
        is_patient_booking = current_user.role == UserRole.PATIENT
        is_doctor_booking = current_user.role == UserRole.DOCTOR
        
        # Send notification to patient
        scheduled_at = consultation_dict.get('scheduled_at', 'TBD')
        consultation_type = consultation_dict.get('consultation_type', 'consultation')
        chief_complaint = consultation_dict.get('chief_complaint', 'General consultation')
        
        # Send console notification
        notification_sent = await send_patient_notification(
            patient_email=patient_email,
            patient_name=patient_name,
            doctor_name=current_user.full_name,
            appointment_datetime=scheduled_at,
            appointment_type=consultation_type,
            chief_complaint=chief_complaint
        )
        
        # Send real-time notifications based on who is booking
        try:
            from api.routes.notifications import notifications_store
            current_utc = datetime.utcnow()
            
            if is_doctor_booking:
                # Doctor is booking for patient - notify patient
                notification = {
                    "_id": str(ObjectId()),
                    "patient_id": str(consultation_dict["patient_id"]),
                    "title": "New Appointment Scheduled",
                    "message": f"Dr. {current_user.full_name} has scheduled an appointment for you on {scheduled_at}. Reason: {chief_complaint}",
                    "type": "appointment",
                    "from_doctor": current_user.full_name,
                    "from_doctor_id": str(current_user.id),
                    "read": False,
                    "created_at": current_utc,
                    "appointment_id": str(consultation_id),
                    "scheduled_at": scheduled_at,
                    "consultation_type": consultation_type
                }
                
                # Store notification for patient
                patient_id_str = str(consultation_dict["patient_id"])
                if patient_id_str not in notifications_store:
                    notifications_store[patient_id_str] = []
                notifications_store[patient_id_str].append(notification)
                
                print(f"🔔 DOCTOR→PATIENT NOTIFICATION: Sent to patient {patient_id_str}")
                
            elif is_patient_booking:
                # Patient is booking - notify all doctors (or specific doctor if assigned)
                if consultation_dict.get("doctor_id"):
                    # Notify specific doctor
                    doctor_id_str = str(consultation_dict["doctor_id"])
                    notification = {
                        "_id": str(ObjectId()),
                        "patient_id": doctor_id_str,  # Using patient_id field for doctor notifications
                        "title": "New Appointment Request",
                        "message": f"Patient {patient_name} has requested an appointment on {scheduled_at}. Reason: {chief_complaint}",
                        "type": "appointment_request",
                        "from_patient": patient_name,
                        "from_patient_id": str(consultation_dict["patient_id"]),
                        "read": False,
                        "created_at": current_utc,
                        "appointment_id": str(consultation_id),
                        "scheduled_at": scheduled_at,
                        "consultation_type": consultation_type
                    }
                    
                    if doctor_id_str not in notifications_store:
                        notifications_store[doctor_id_str] = []
                    notifications_store[doctor_id_str].append(notification)
                    
                    print(f"🔔 PATIENT→DOCTOR NOTIFICATION: Sent to doctor {doctor_id_str}")
                else:
                    # Notify all doctors about new appointment request
                    doctors_cursor = users_collection.find({"role": "doctor"})
                    doctors = await doctors_cursor.to_list(length=None)
                    
                    for doctor in doctors:
                        doctor_id_str = str(doctor["_id"])
                        notification = {
                            "_id": str(ObjectId()),
                            "patient_id": doctor_id_str,  # Using patient_id field for doctor notifications
                            "title": "New Appointment Request",
                            "message": f"Patient {patient_name} has requested an appointment on {scheduled_at}. Reason: {chief_complaint}",
                            "type": "appointment_request",
                            "from_patient": patient_name,
                            "from_patient_id": str(consultation_dict["patient_id"]),
                            "read": False,
                            "created_at": current_utc,
                            "appointment_id": str(consultation_id),
                            "scheduled_at": scheduled_at,
                            "consultation_type": consultation_type
                        }
                        
                        if doctor_id_str not in notifications_store:
                            notifications_store[doctor_id_str] = []
                        notifications_store[doctor_id_str].append(notification)
                    
                    print(f"🔔 PATIENT→ALL DOCTORS NOTIFICATION: Sent to {len(doctors)} doctors")
            
            print(f"⏰ Notification timestamp: {current_utc.isoformat()}")
            
        except Exception as e:
            print(f"⚠️ Failed to send real-time notification: {e}")
            # Don't fail the appointment creation if notification fails
        
        return {
            "message": "Appointment created successfully",
            "consultation_id": str(consultation_id),
            "patient_name": patient_name,
            "patient_email": patient_email,
            "notification_sent": notification_sent,
            "scheduled_at": scheduled_at,
            "consultation_type": consultation_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating consultation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create consultation: {str(e)}"
        )

@router.get("/pending", response_model=dict)
async def get_pending_consultations(
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Get pending consultations that need doctor assignment"""
    consultations_collection = await get_consultations_collection()
    
    # Find consultations without assigned doctor
    cursor = consultations_collection.find({
        "doctor_id": None,
        "status": "scheduled"
    }).sort("created_at", -1)
    
    consultations = []
    async for consultation in cursor:
        consultation["_id"] = str(consultation["_id"])
        if consultation.get("patient_id"):
            consultation["patient_id"] = str(consultation["patient_id"])
        consultations.append(consultation)
    
    return {"consultations": consultations}

@router.post("/{consultation_id}/accept")
async def accept_consultation(
    consultation_id: str,
    current_user: User = Depends(require_roles([UserRole.DOCTOR]))
):
    """Doctor accepts/claims a pending consultation"""
    consultations_collection = await get_consultations_collection()
    users_collection = await get_users_collection()
    
    try:
        # First get the consultation to get patient info
        consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation not found"
            )
        
        # Update consultation with doctor assignment
        result = await consultations_collection.update_one(
            {
                "_id": ObjectId(consultation_id),
                "doctor_id": None,  # Only allow claiming unassigned consultations
                "status": "scheduled"
            },
            {
                "$set": {
                    "doctor_id": ObjectId(current_user.id),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultation not found or already assigned"
            )
        
        # Send notification to patient about doctor acceptance
        try:
            from api.routes.notifications import notifications_store
            
            # Get patient information
            patient = await users_collection.find_one({"_id": consultation["patient_id"]})
            patient_name = patient.get("full_name", "Unknown Patient") if patient else "Unknown Patient"
            
            # Create notification for patient
            current_utc = datetime.utcnow()
            scheduled_at = consultation.get('scheduled_at', 'TBD')
            chief_complaint = consultation.get('chief_complaint', 'General consultation')
            
            notification = {
                "_id": str(ObjectId()),
                "patient_id": str(consultation["patient_id"]),
                "title": "Appointment Accepted",
                "message": f"Dr. {current_user.full_name} has accepted your appointment request for {scheduled_at}. Reason: {chief_complaint}",
                "type": "appointment_accepted",
                "from_doctor": current_user.full_name,
                "from_doctor_id": str(current_user.id),
                "read": False,
                "created_at": current_utc,
                "appointment_id": str(consultation_id),
                "scheduled_at": scheduled_at,
                "consultation_type": consultation.get('consultation_type', 'consultation')
            }
            
            # Store notification for patient
            patient_id_str = str(consultation["patient_id"])
            if patient_id_str not in notifications_store:
                notifications_store[patient_id_str] = []
            notifications_store[patient_id_str].append(notification)
            
            print(f"🔔 DOCTOR ACCEPTANCE NOTIFICATION: Sent to patient {patient_id_str}")
            print(f"👨‍⚕️ Dr. {current_user.full_name} accepted appointment for {patient_name}")
            
        except Exception as e:
            print(f"⚠️ Failed to send acceptance notification: {e}")
            # Don't fail the acceptance if notification fails
        
        return {"message": "Consultation accepted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept consultation: {str(e)}"
        )

@router.get("/my-consultations")
async def get_my_consultations(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """Get user's consultations with patient/doctor names"""
    consultations_collection = await get_consultations_collection()
    users_collection = await get_users_collection()
    
    if current_user.role == UserRole.PATIENT:
        query = {"patient_id": ObjectId(current_user.id)}
    elif current_user.role == UserRole.DOCTOR:
        query = {"doctor_id": ObjectId(current_user.id)}
    else:
        query = {}  # Admin can see all
    
    cursor = consultations_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    consultations = await cursor.to_list(length=limit)
    
    # Enrich consultations with patient/doctor names
    enriched_consultations = []
    for consultation in consultations:
        # Serialize the consultation document
        consultation_dict = serialize_document(consultation)
        
        # Get patient information
        if consultation.get("patient_id"):
            patient = await users_collection.find_one({"_id": consultation["patient_id"]})
            if patient:
                consultation_dict["patient_name"] = patient.get("full_name", "Unknown Patient")
                consultation_dict["patient_email"] = patient.get("email", "")
                consultation_dict["patient_phone"] = patient.get("phone", "")
            else:
                consultation_dict["patient_name"] = "Unknown Patient"
                consultation_dict["patient_email"] = ""
                consultation_dict["patient_phone"] = ""
        
        # Get doctor name if assigned
        if consultation.get("doctor_id"):
            doctor = await users_collection.find_one({"_id": consultation["doctor_id"]})
            consultation_dict["doctor_name"] = doctor.get("full_name", "Unknown Doctor") if doctor else "Unknown Doctor"
        
        enriched_consultations.append(consultation_dict)
    
    return enriched_consultations

@router.patch("/{consultation_id}/status")
async def update_consultation_status(
    consultation_id: str,
    status: str,
    current_user: User = Depends(get_current_active_user)
):
    """Update consultation status (for both patient and doctor)"""
    try:
        consultations_collection = await get_consultations_collection()
        users_collection = await get_users_collection()
        
        # Validate status
        valid_statuses = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        # Get the consultation
        consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Debug logging for authorization
        print(f"Debug - Consultation patient_id: {consultation['patient_id']}")
        print(f"Debug - Current user id: {current_user.id}")
        print(f"Debug - Current user role: {current_user.role}")
        print(f"Debug - Consultation doctor_id: {consultation.get('doctor_id')}")
        
        # Check if user has permission to update this consultation
        is_patient = str(consultation["patient_id"]) == str(current_user.id)
        is_doctor = consultation.get("doctor_id") and str(consultation["doctor_id"]) == str(current_user.id)
        is_admin = current_user.role == UserRole.ADMIN
        
        user_can_update = is_patient or is_doctor or is_admin
        
        print(f"Debug - Is patient: {is_patient}, Is doctor: {is_doctor}, Is admin: {is_admin}")
        print(f"Debug - Can update: {user_can_update}")
        
        if not user_can_update:
            raise HTTPException(
                status_code=403, 
                detail=f"Not authorized to update this consultation. User {current_user.id} ({current_user.role}) cannot update consultation for patient {consultation['patient_id']}"
            )
        
        # Update the consultation status
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        # Add completion timestamp if marking as completed
        if status == "completed":
            update_data["completed_at"] = datetime.utcnow()
            update_data["completed_by"] = current_user.id
        
        result = await consultations_collection.update_one(
            {"_id": ObjectId(consultation_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update consultation status")
        
        # Get updated consultation with user names for notification
        updated_consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
        
        # Get patient and doctor names for notification
        patient = await users_collection.find_one({"_id": updated_consultation["patient_id"]})
        patient_name = patient.get("full_name", "Unknown Patient") if patient else "Unknown Patient"
        
        doctor_name = "Unassigned"
        if updated_consultation.get("doctor_id"):
            doctor = await users_collection.find_one({"_id": updated_consultation["doctor_id"]})
            doctor_name = doctor.get("full_name", "Unknown Doctor") if doctor else "Unknown Doctor"
        
        # Create notification message
        if current_user.role == UserRole.PATIENT:
            notification_message = f"Patient {current_user.full_name} marked consultation as '{status}'"
        else:
            notification_message = f"Dr. {current_user.full_name} marked consultation as '{status}'"
        
        return {
            "message": f"Consultation status updated to '{status}' successfully",
            "consultation_id": consultation_id,
            "new_status": status,
            "updated_by": current_user.full_name,
            "notification": notification_message,
            "patient_name": patient_name,
            "doctor_name": doctor_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update consultation status: {str(e)}"
        )

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
