from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId
from database.connection import get_database
from auth.security import get_current_user
from models.user import User
import math

router = APIRouter(tags=["health-records"])

class HealthRecord(BaseModel):
    # Basic vitals
    weight: Optional[float] = Field(None, description="Weight in kg")
    height: Optional[float] = Field(None, description="Height in cm")
    blood_pressure_systolic: Optional[int] = Field(None, description="Systolic BP")
    blood_pressure_diastolic: Optional[int] = Field(None, description="Diastolic BP")
    heart_rate: Optional[int] = Field(None, description="Heart rate BPM")
    
    # Additional vitals
    body_temperature: Optional[float] = Field(None, description="Body temperature in Celsius")
    respiratory_rate: Optional[int] = Field(None, description="Respiratory rate breaths/min")
    oxygen_saturation: Optional[int] = Field(None, description="Oxygen saturation percentage")
    
    # Lifestyle factors
    exercise_hours_per_week: Optional[float] = Field(None, description="Exercise hours per week")
    sleep_hours_per_night: Optional[float] = Field(None, description="Average sleep hours")
    water_intake_glasses: Optional[int] = Field(None, description="Daily water intake in glasses")
    smoking_status: Optional[str] = Field(None, description="never/former/current")
    alcohol_consumption: Optional[str] = Field(None, description="none/light/moderate/heavy")
    
    # Diet and nutrition
    diet_type: Optional[str] = Field(None, description="Diet type")
    meals_per_day: Optional[int] = Field(None, description="Number of meals per day")
    fruit_vegetable_servings: Optional[int] = Field(None, description="Fruit and vegetable servings per day")
    
    # Medical history
    diabetes: Optional[bool] = Field(False, description="Has diabetes")
    hypertension: Optional[bool] = Field(False, description="Has hypertension")
    heart_disease: Optional[bool] = Field(False, description="Has heart disease")
    
    # Additional medical conditions
    asthma: Optional[bool] = Field(False, description="Has asthma")
    arthritis: Optional[bool] = Field(False, description="Has arthritis")
    depression: Optional[bool] = Field(False, description="Has depression")
    anxiety: Optional[bool] = Field(False, description="Has anxiety")
    
    # Family history
    family_diabetes: Optional[bool] = Field(False, description="Family history of diabetes")
    family_heart_disease: Optional[bool] = Field(False, description="Family history of heart disease")
    family_cancer: Optional[bool] = Field(False, description="Family history of cancer")
    
    # Lab values (optional)
    cholesterol_total: Optional[float] = Field(None, description="Total cholesterol mg/dL")
    blood_sugar_fasting: Optional[float] = Field(None, description="Fasting blood sugar mg/dL")
    
    # Additional lab values
    cholesterol_hdl: Optional[float] = Field(None, description="HDL cholesterol mg/dL")
    cholesterol_ldl: Optional[float] = Field(None, description="LDL cholesterol mg/dL")
    triglycerides: Optional[float] = Field(None, description="Triglycerides mg/dL")
    hemoglobin: Optional[float] = Field(None, description="Hemoglobin g/dL")
    
    # Subjective measures
    stress_level: Optional[int] = Field(None, ge=1, le=10, description="Stress level 1-10")
    energy_level: Optional[int] = Field(None, ge=1, le=10, description="Energy level 1-10")
    
    # Additional wellness metrics
    sleep_quality: Optional[int] = Field(None, ge=1, le=10, description="Sleep quality 1-10")
    pain_level: Optional[int] = Field(None, ge=1, le=10, description="Pain level 1-10")
    mood_level: Optional[int] = Field(None, ge=1, le=10, description="Mood level 1-10")
    
    recorded_at: datetime = Field(default_factory=datetime.now)

class HealthRecordResponse(HealthRecord):
    id: str
    user_id: str
    calculated_bmi: Optional[float] = None
    health_score: Optional[float] = None

def calculate_bmi(weight: float, height: float) -> float:
    """Calculate BMI from weight (kg) and height (cm)"""
    if not weight or not height:
        return None
    height_m = height / 100  # Convert cm to meters
    return round(weight / (height_m ** 2), 1)

def calculate_health_score(record: HealthRecord) -> float:
    """
    Calculate overall health score based on various health metrics
    Score ranges from 0-100, where 100 is optimal health
    """
    score = 100.0
    
    # BMI Score (20 points max)
    if record.weight and record.height:
        bmi = calculate_bmi(record.weight, record.height)
        if 18.5 <= bmi <= 24.9:  # Normal BMI
            bmi_score = 20
        elif 25 <= bmi <= 29.9:  # Overweight
            bmi_score = 15
        elif 17 <= bmi < 18.5 or 30 <= bmi <= 34.9:  # Underweight or Obese I
            bmi_score = 10
        else:  # Severely underweight or obese
            bmi_score = 5
        score = score - 20 + bmi_score
    
    # Blood Pressure Score (15 points max)
    if record.blood_pressure_systolic and record.blood_pressure_diastolic:
        sys_bp = record.blood_pressure_systolic
        dia_bp = record.blood_pressure_diastolic
        
        if sys_bp < 120 and dia_bp < 80:  # Normal
            bp_score = 15
        elif sys_bp < 130 and dia_bp < 80:  # Elevated
            bp_score = 12
        elif (120 <= sys_bp <= 129) or (80 <= dia_bp <= 89):  # Stage 1 hypertension
            bp_score = 8
        else:  # Stage 2 hypertension
            bp_score = 3
        score = score - 15 + bp_score
    
    # Heart Rate Score (10 points max)
    if record.heart_rate:
        hr = record.heart_rate
        if 60 <= hr <= 100:  # Normal resting heart rate
            hr_score = 10
        elif 50 <= hr < 60 or 100 < hr <= 110:  # Slightly abnormal
            hr_score = 7
        else:  # Abnormal
            hr_score = 3
        score = score - 10 + hr_score
    
    # Exercise Score (15 points max)
    if record.exercise_hours_per_week is not None:
        exercise = record.exercise_hours_per_week
        if exercise >= 5:  # Excellent (5+ hours/week)
            exercise_score = 15
        elif exercise >= 3:  # Good (3-5 hours/week)
            exercise_score = 12
        elif exercise >= 1:  # Fair (1-3 hours/week)
            exercise_score = 8
        else:  # Poor (< 1 hour/week)
            exercise_score = 3
        score = score - 15 + exercise_score
    
    # Sleep Score (10 points max)
    if record.sleep_hours_per_night is not None:
        sleep = record.sleep_hours_per_night
        if 7 <= sleep <= 9:  # Optimal sleep
            sleep_score = 10
        elif 6 <= sleep < 7 or 9 < sleep <= 10:  # Good sleep
            sleep_score = 7
        else:  # Poor sleep
            sleep_score = 3
        score = score - 10 + sleep_score
    
    # Lifestyle Factors (10 points max)
    lifestyle_score = 10
    
    # Smoking penalty
    if record.smoking_status == "current":
        lifestyle_score -= 5
    elif record.smoking_status == "former":
        lifestyle_score -= 2
    
    # Alcohol penalty
    if record.alcohol_consumption == "heavy":
        lifestyle_score -= 3
    elif record.alcohol_consumption == "moderate":
        lifestyle_score -= 1
    
    score = score - 10 + max(0, lifestyle_score)
    
    # Medical Conditions Penalty (10 points max)
    conditions_penalty = 0
    if record.diabetes:
        conditions_penalty += 4
    if record.hypertension:
        conditions_penalty += 3
    if record.heart_disease:
        conditions_penalty += 5
    
    score = score - min(10, conditions_penalty)
    
    # Stress and Energy (10 points max)
    if record.stress_level is not None and record.energy_level is not None:
        # Lower stress and higher energy = better score
        stress_impact = (10 - record.stress_level) / 10 * 5  # 0-5 points
        energy_impact = record.energy_level / 10 * 5  # 0-5 points
        wellbeing_score = stress_impact + energy_impact
        score = score - 10 + wellbeing_score
    
    # Additional Medical Conditions Penalty
    if record.asthma:
        conditions_penalty += 2
    if record.arthritis:
        conditions_penalty += 2
    if record.depression:
        conditions_penalty += 3
    if record.anxiety:
        conditions_penalty += 2
    
    # Family History Risk Factor (3 points max penalty)
    family_risk = 0
    if record.family_diabetes:
        family_risk += 1
    if record.family_heart_disease:
        family_risk += 1.5
    if record.family_cancer:
        family_risk += 0.5
    
    score = score - min(3, family_risk)
    
    # Additional Vital Signs (5 points max)
    vitals_bonus = 5
    if record.body_temperature is not None:
        temp = record.body_temperature
        if not (36.1 <= temp <= 37.2):  # Normal range
            vitals_bonus -= 1
    
    if record.respiratory_rate is not None:
        rr = record.respiratory_rate
        if not (12 <= rr <= 20):  # Normal range
            vitals_bonus -= 1
    
    if record.oxygen_saturation is not None:
        o2 = record.oxygen_saturation
        if o2 < 95:  # Low oxygen saturation
            vitals_bonus -= 2
        elif o2 < 98:
            vitals_bonus -= 1
    
    score = score - 5 + max(0, vitals_bonus)
    
    # Nutrition and Diet (5 points max)
    nutrition_score = 0
    if record.fruit_vegetable_servings is not None:
        servings = record.fruit_vegetable_servings
        if servings >= 5:  # Recommended daily intake
            nutrition_score += 3
        elif servings >= 3:
            nutrition_score += 2
        elif servings >= 1:
            nutrition_score += 1
    
    if record.water_intake_glasses is not None:
        water = record.water_intake_glasses
        if water >= 8:  # Recommended daily intake
            nutrition_score += 2
        elif water >= 6:
            nutrition_score += 1
    
    score = score + min(5, nutrition_score)
    
    # Additional Wellness Metrics (5 points max)
    wellness_bonus = 0
    if record.sleep_quality is not None:
        if record.sleep_quality >= 8:
            wellness_bonus += 2
        elif record.sleep_quality >= 6:
            wellness_bonus += 1
    
    if record.mood_level is not None:
        if record.mood_level >= 8:
            wellness_bonus += 2
        elif record.mood_level >= 6:
            wellness_bonus += 1
    
    if record.pain_level is not None:
        if record.pain_level <= 3:  # Low pain
            wellness_bonus += 1
    
    score = score + min(5, wellness_bonus)
    
    # Lab Values Bonus (8 points max - expanded)
    lab_bonus = 0
    if record.cholesterol_total is not None:
        if record.cholesterol_total < 200:  # Desirable
            lab_bonus += 2
        elif record.cholesterol_total < 240:  # Borderline
            lab_bonus += 1
    
    if record.cholesterol_hdl is not None:
        if record.cholesterol_hdl >= 60:  # High (protective)
            lab_bonus += 2
        elif record.cholesterol_hdl >= 40:  # Normal
            lab_bonus += 1
    
    if record.cholesterol_ldl is not None:
        if record.cholesterol_ldl < 100:  # Optimal
            lab_bonus += 2
        elif record.cholesterol_ldl < 130:  # Near optimal
            lab_bonus += 1
    
    if record.blood_sugar_fasting is not None:
        if record.blood_sugar_fasting < 100:  # Normal
            lab_bonus += 2
        elif record.blood_sugar_fasting < 126:  # Prediabetes
            lab_bonus += 1
    
    score = score - 8 + min(8, lab_bonus)
    
    # Ensure score is between 0 and 100
    return round(max(0, min(100, score)), 1)

@router.post("/", response_model=HealthRecordResponse)
async def create_health_record(
    record: HealthRecord,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new health record for the current user"""
    
    # Calculate derived metrics
    bmi = None
    if record.weight and record.height:
        bmi = calculate_bmi(record.weight, record.height)
    
    # Calculate health score
    health_score = calculate_health_score(record)
    
    # Prepare document for insertion
    record_dict = record.dict()
    record_dict["user_id"] = ObjectId(current_user.id)
    record_dict["calculated_bmi"] = bmi
    record_dict["health_score"] = health_score
    
    # Insert into database
    result = await db.health_records.insert_one(record_dict)
    
    # Return the created record
    created_record = await db.health_records.find_one({"_id": result.inserted_id})
    created_record["id"] = str(created_record["_id"])
    created_record["user_id"] = str(created_record["user_id"])
    
    return HealthRecordResponse(**created_record)

@router.get("/latest", response_model=Optional[HealthRecordResponse])
async def get_latest_health_record(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get the most recent health record for the current user"""
    
    record = await db.health_records.find_one(
        {"user_id": ObjectId(current_user.id)},
        sort=[("recorded_at", -1)]
    )
    
    if not record:
        return None
    
    record["id"] = str(record["_id"])
    record["user_id"] = str(record["user_id"])
    
    return HealthRecordResponse(**record)

@router.get("/", response_model=List[HealthRecordResponse])
async def get_health_records(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get health records for the current user"""
    
    cursor = db.health_records.find(
        {"user_id": ObjectId(current_user.id)}
    ).sort("recorded_at", -1).limit(limit)
    
    records = []
    async for record in cursor:
        record["id"] = str(record["_id"])
        record["user_id"] = str(record["user_id"])
        records.append(HealthRecordResponse(**record))
    
    return records

@router.get("/health-score")
async def get_current_health_score(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get the current health score for the user"""
    
    latest_record = await db.health_records.find_one(
        {"user_id": ObjectId(current_user.id)},
        sort=[("recorded_at", -1)]
    )
    
    if not latest_record:
        return {
            "health_score": None,
            "message": "No health records found. Please add your health information to get a personalized score."
        }
    
    return {
        "health_score": latest_record.get("health_score", 0),
        "recorded_at": latest_record.get("recorded_at"),
        "bmi": latest_record.get("calculated_bmi"),
        "message": "Health score calculated from your latest health record."
    }

@router.delete("/{record_id}")
async def delete_health_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a health record"""
    
    result = await db.health_records.delete_one({
        "_id": ObjectId(record_id),
        "user_id": ObjectId(current_user.id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found"
        )
    
    return {"message": "Health record deleted successfully"}
