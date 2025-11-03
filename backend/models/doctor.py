"""
Doctor models and schemas
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, time
from enum import Enum
from bson import ObjectId
from .user import PyObjectId

class Specialization(str, Enum):
    CARDIOLOGY = "cardiology"
    DERMATOLOGY = "dermatology"
    ENDOCRINOLOGY = "endocrinology"
    GASTROENTEROLOGY = "gastroenterology"
    GENERAL_PRACTICE = "general_practice"
    NEUROLOGY = "neurology"
    ONCOLOGY = "oncology"
    ORTHOPEDICS = "orthopedics"
    PEDIATRICS = "pediatrics"
    PSYCHIATRY = "psychiatry"
    RADIOLOGY = "radiology"
    SURGERY = "surgery"

class Qualification(BaseModel):
    degree: str
    institution: str
    year: int
    country: str

class Experience(BaseModel):
    position: str
    hospital_clinic: str
    start_date: datetime
    end_date: Optional[datetime] = None
    description: Optional[str] = None

class Availability(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    is_available: bool = True

class DoctorBase(BaseModel):
    user_id: PyObjectId
    license_number: str
    specializations: List[Specialization]
    qualifications: List[Qualification]
    experience: List[Experience] = []
    years_of_experience: int
    consultation_fee: float
    languages_spoken: List[str] = ["English"]
    availability: List[Availability] = []
    bio: Optional[str] = None
    hospital_affiliations: List[str] = []
    certifications: List[str] = []

class DoctorCreate(DoctorBase):
    pass

class DoctorUpdate(BaseModel):
    license_number: Optional[str] = None
    specializations: Optional[List[Specialization]] = None
    qualifications: Optional[List[Qualification]] = None
    experience: Optional[List[Experience]] = None
    years_of_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    languages_spoken: Optional[List[str]] = None
    availability: Optional[List[Availability]] = None
    bio: Optional[str] = None
    hospital_affiliations: Optional[List[str]] = None
    certifications: Optional[List[str]] = None

class DoctorInDB(DoctorBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    rating: float = 0.0
    total_consultations: int = 0
    is_verified: bool = False

class Doctor(DoctorBase):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime
    updated_at: datetime
    rating: float = 0.0
    total_consultations: int = 0
    is_verified: bool = False
