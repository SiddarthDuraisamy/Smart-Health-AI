"""
Patient models and schemas
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
from .user import PyObjectId

class BloodType(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str
    email: Optional[str] = None

class MedicalHistory(BaseModel):
    condition: str
    diagnosed_date: Optional[datetime] = None
    status: str  # active, resolved, chronic
    notes: Optional[str] = None

class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: datetime
    end_date: Optional[datetime] = None
    prescribed_by: str
    notes: Optional[str] = None

class Allergy(BaseModel):
    allergen: str
    severity: str  # mild, moderate, severe
    reaction: str
    notes: Optional[str] = None

class VitalSigns(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None  # Celsius
    weight: Optional[float] = None  # kg
    height: Optional[float] = None  # cm
    oxygen_saturation: Optional[float] = None
    blood_glucose: Optional[float] = None  # mg/dL

class LifestyleData(BaseModel):
    smoking_status: Optional[str] = None  # never, former, current
    alcohol_consumption: Optional[str] = None  # none, light, moderate, heavy
    exercise_frequency: Optional[str] = None  # daily, weekly, monthly, rarely, never
    diet_type: Optional[str] = None  # vegetarian, vegan, omnivore, etc.
    sleep_hours: Optional[float] = None
    stress_level: Optional[int] = Field(None, ge=1, le=10)

class PatientBase(BaseModel):
    user_id: PyObjectId
    medical_record_number: str
    gender: Gender
    blood_type: Optional[BloodType] = None
    emergency_contacts: List[EmergencyContact] = []
    medical_history: List[MedicalHistory] = []
    current_medications: List[Medication] = []
    allergies: List[Allergy] = []
    lifestyle_data: Optional[LifestyleData] = None
    insurance_info: Optional[Dict[str, Any]] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    gender: Optional[Gender] = None
    blood_type: Optional[BloodType] = None
    emergency_contacts: Optional[List[EmergencyContact]] = None
    medical_history: Optional[List[MedicalHistory]] = None
    current_medications: Optional[List[Medication]] = None
    allergies: Optional[List[Allergy]] = None
    lifestyle_data: Optional[LifestyleData] = None
    insurance_info: Optional[Dict[str, Any]] = None

class PatientInDB(PatientBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    vital_signs_history: List[VitalSigns] = []

class Patient(PatientBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime
    updated_at: datetime
    vital_signs_history: List[VitalSigns] = []
