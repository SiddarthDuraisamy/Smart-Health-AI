"""
Consultation models and schemas
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
from .user import PyObjectId

class ConsultationType(str, Enum):
    INITIAL = "initial"
    FOLLOW_UP = "follow_up"
    EMERGENCY = "emergency"
    AI_ASSISTED = "ai_assisted"
    SECOND_OPINION = "second_opinion"

class ConsultationStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Symptom(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)  # 1-10 scale
    duration: str  # e.g., "2 days", "1 week"
    description: Optional[str] = None

class Diagnosis(BaseModel):
    condition: str
    icd_code: Optional[str] = None
    confidence: float = Field(ge=0, le=1)  # AI confidence score
    notes: Optional[str] = None
    suggested_by: str  # "ai" or doctor_id

class Treatment(BaseModel):
    type: str  # medication, therapy, surgery, lifestyle
    description: str
    duration: Optional[str] = None
    instructions: Optional[str] = None
    prescribed_by: str

class AIInsight(BaseModel):
    insight_type: str  # risk_assessment, recommendation, alert
    content: str
    confidence: float = Field(ge=0, le=1)
    generated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    model_used: str

class ChatMessage(BaseModel):
    sender: str  # patient_id, doctor_id, or "ai"
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())
    message_type: str = "text"  # text, image, file
    language: str = "en"

class ConsultationBase(BaseModel):
    patient_id: PyObjectId
    doctor_id: Optional[PyObjectId] = None
    consultation_type: ConsultationType
    status: ConsultationStatus = ConsultationStatus.SCHEDULED
    priority: Priority = Priority.MEDIUM
    scheduled_at: datetime
    chief_complaint: str
    symptoms: List[Symptom] = []
    vital_signs: Optional[Dict[str, Any]] = None

class ConsultationCreate(BaseModel):
    patient_id: Optional[PyObjectId] = None  # Will be set by backend for patients
    doctor_id: Optional[PyObjectId] = None
    consultation_type: ConsultationType
    status: ConsultationStatus = ConsultationStatus.SCHEDULED
    priority: Priority = Priority.MEDIUM
    scheduled_at: datetime
    chief_complaint: str
    symptoms: List[Symptom] = []
    vital_signs: Optional[Dict[str, Any]] = None

class ConsultationUpdate(BaseModel):
    doctor_id: Optional[PyObjectId] = None
    status: Optional[ConsultationStatus] = None
    priority: Optional[Priority] = None
    scheduled_at: Optional[datetime] = None
    chief_complaint: Optional[str] = None
    symptoms: Optional[List[Symptom]] = None
    vital_signs: Optional[Dict[str, Any]] = None

class ConsultationInDB(ConsultationBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    
    # Clinical data
    diagnoses: List[Diagnosis] = []
    treatments: List[Treatment] = []
    prescriptions: List[Dict[str, Any]] = []
    
    # AI integration
    ai_insights: List[AIInsight] = []
    ai_summary: Optional[str] = None
    
    # Communication
    chat_messages: List[ChatMessage] = []
    
    # Files and attachments
    attachments: List[str] = []  # file URLs/paths
    
    # Follow-up
    follow_up_required: bool = False
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    
    # Billing
    consultation_fee: Optional[float] = None
    payment_status: str = "pending"
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Consultation(ConsultationBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    
    diagnoses: List[Diagnosis] = []
    treatments: List[Treatment] = []
    prescriptions: List[Dict[str, Any]] = []
    ai_insights: List[AIInsight] = []
    ai_summary: Optional[str] = None
    chat_messages: List[ChatMessage] = []
    attachments: List[str] = []
    
    follow_up_required: bool = False
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    
    consultation_fee: Optional[float] = None
    payment_status: str = "pending"
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
