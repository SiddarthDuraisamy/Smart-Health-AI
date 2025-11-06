"""
Analytics routes for health data insights and reporting
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, List, Any, Optional
from bson import ObjectId
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from models.user import User, UserRole
from auth.security import get_current_active_user, require_roles
from database.connection import (
    get_patients_collection, get_consultations_collection, 
    get_doctors_collection, get_users_collection, get_ai_predictions_collection
)

router = APIRouter()

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_analytics_dashboard(
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Get analytics dashboard data"""
    patients_collection = await get_patients_collection()
    consultations_collection = await get_consultations_collection()
    doctors_collection = await get_doctors_collection()
    
    # Basic counts - count users by role for consistency
    users_collection = await get_users_collection()
    total_patients = await users_collection.count_documents({"role": "patient"})
    total_doctors = await users_collection.count_documents({"role": "doctor"})
    total_consultations = await consultations_collection.count_documents({})
    
    # Debug logging for patient count consistency
    patient_profiles_count = await patients_collection.count_documents({})
    print(f"📊 Analytics Dashboard - Users with patient role: {total_patients}, Patient profiles: {patient_profiles_count}")
    
    # Recent activity (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_consultations = await consultations_collection.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Consultation status breakdown
    consultation_statuses = await consultations_collection.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    
    # Top conditions
    top_conditions = await consultations_collection.aggregate([
        {"$unwind": "$diagnoses"},
        {"$group": {"_id": "$diagnoses.condition", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(length=None)
    
    # Calculate additional metrics
    completed_consultations = await consultations_collection.count_documents({"status": "completed"})
    completion_rate = (completed_consultations / total_consultations * 100) if total_consultations > 0 else 0
    
    # Average consultation duration (mock data for now)
    avg_consultation_duration = 45  # minutes
    
    # Patient satisfaction (mock data)
    patient_satisfaction = 4.2  # out of 5
    
    # Revenue metrics (mock data)
    monthly_revenue = 25000
    
    return {
        "overview": {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_consultations": total_consultations,
            "recent_consultations": recent_consultations,
            "completion_rate": round(completion_rate, 1),
            "avg_consultation_duration": avg_consultation_duration,
            "patient_satisfaction": patient_satisfaction,
            "monthly_revenue": monthly_revenue
        },
        "consultation_statuses": {status["_id"]: status["count"] for status in consultation_statuses},
        "top_conditions": top_conditions[:10],
        "charts": {
            "consultation_trends": [
                {"month": "Jan", "consultations": 45, "revenue": 22500},
                {"month": "Feb", "consultations": 52, "revenue": 26000},
                {"month": "Mar", "consultations": 48, "revenue": 24000},
                {"month": "Apr", "consultations": 61, "revenue": 30500},
                {"month": "May", "consultations": 55, "revenue": 27500}
            ],
            "condition_distribution": [
                {"condition": "Hypertension", "count": 15, "percentage": 25},
                {"condition": "Diabetes", "count": 12, "percentage": 20},
                {"condition": "Common Cold", "count": 10, "percentage": 17},
                {"condition": "Anxiety", "count": 8, "percentage": 13},
                {"condition": "Back Pain", "count": 7, "percentage": 12},
                {"condition": "Others", "count": 8, "percentage": 13}
            ]
        },
        "generated_at": datetime.utcnow()
    }

@router.get("/patient-analytics/{patient_id}", response_model=Dict[str, Any])
async def get_patient_analytics(
    patient_id: str,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Get detailed analytics for a specific patient"""
    patients_collection = await get_patients_collection()
    consultations_collection = await get_consultations_collection()
    
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
    
    # Get patient's consultations
    consultations = await consultations_collection.find({
        "patient_id": ObjectId(patient_id)
    }).sort("created_at", -1).to_list(length=None)
    
    # Analyze vital signs trends
    vital_signs_analysis = analyze_vital_signs_trends(patient.get("vital_signs_history", []))
    
    # Consultation frequency
    consultation_frequency = calculate_consultation_frequency(consultations)
    
    # Health risk trends
    risk_trends = calculate_risk_trends(consultations)
    
    return {
        "patient_id": patient_id,
        "total_consultations": len(consultations),
        "vital_signs_analysis": vital_signs_analysis,
        "consultation_frequency": consultation_frequency,
        "risk_trends": risk_trends,
        "recent_diagnoses": get_recent_diagnoses(consultations),
        "medication_adherence": calculate_medication_adherence(patient),
        "generated_at": datetime.utcnow()
    }

@router.get("/health-trends", response_model=Dict[str, Any])
async def get_health_trends(
    time_period: str = "30d",  # 7d, 30d, 90d, 1y
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Get population health trends"""
    consultations_collection = await get_consultations_collection()
    patients_collection = await get_patients_collection()
    
    # Calculate date range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(time_period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Consultation trends
    consultation_trends = await consultations_collection.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]).to_list(length=None)
    
    # Disease prevalence
    disease_prevalence = await consultations_collection.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$unwind": "$diagnoses"},
        {"$group": {"_id": "$diagnoses.condition", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]).to_list(length=None)
    
    # Age group analysis
    age_group_analysis = await analyze_age_groups(patients_collection, consultations_collection, start_date)
    
    return {
        "time_period": time_period,
        "consultation_trends": consultation_trends,
        "disease_prevalence": disease_prevalence,
        "age_group_analysis": age_group_analysis,
        "generated_at": datetime.utcnow()
    }

@router.get("/doctor-performance", response_model=Dict[str, Any])
async def get_doctor_performance(
    doctor_id: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """Get doctor performance analytics (admin only)"""
    consultations_collection = await get_consultations_collection()
    doctors_collection = await get_doctors_collection()
    
    if doctor_id:
        # Specific doctor analytics
        try:
            doctor = await doctors_collection.find_one({"_id": ObjectId(doctor_id)})
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
        
        consultations = await consultations_collection.find({
            "doctor_id": ObjectId(doctor_id)
        }).to_list(length=None)
        
        return analyze_doctor_performance(doctor, consultations)
    
    else:
        # All doctors performance summary
        doctors = await doctors_collection.find({}).to_list(length=None)
        performance_summary = []
        
        for doctor in doctors:
            consultations = await consultations_collection.find({
                "doctor_id": doctor["_id"]
            }).to_list(length=None)
            
            performance = analyze_doctor_performance(doctor, consultations)
            performance_summary.append({
                "doctor_id": str(doctor["_id"]),
                "doctor_name": doctor.get("full_name", "Unknown"),
                "specializations": doctor.get("specializations", []),
                "performance_metrics": performance
            })
        
        return {
            "doctors_performance": performance_summary,
            "generated_at": datetime.utcnow()
        }

def analyze_vital_signs_trends(vital_signs_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze trends in vital signs"""
    if not vital_signs_history:
        return {"status": "no_data"}
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(vital_signs_history)
    
    trends = {}
    
    # Analyze each vital sign
    for column in ['blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'weight', 'temperature']:
        if column in df.columns:
            values = df[column].dropna()
            if len(values) >= 2:
                # Simple trend calculation
                first_half = values[:len(values)//2].mean()
                second_half = values[len(values)//2:].mean()
                
                if second_half > first_half * 1.05:
                    trend = "increasing"
                elif second_half < first_half * 0.95:
                    trend = "decreasing"
                else:
                    trend = "stable"
                
                trends[column] = {
                    "trend": trend,
                    "latest_value": float(values.iloc[-1]) if not values.empty else None,
                    "average": float(values.mean()),
                    "readings_count": len(values)
                }
    
    return trends

def calculate_consultation_frequency(consultations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate consultation frequency patterns"""
    if not consultations:
        return {"frequency": "no_data"}
    
    # Sort by date
    consultations.sort(key=lambda x: x.get("created_at", datetime.min))
    
    if len(consultations) < 2:
        return {"frequency": "insufficient_data", "total_consultations": len(consultations)}
    
    # Calculate intervals between consultations
    intervals = []
    for i in range(1, len(consultations)):
        prev_date = consultations[i-1].get("created_at")
        curr_date = consultations[i].get("created_at")
        if prev_date and curr_date:
            interval = (curr_date - prev_date).days
            intervals.append(interval)
    
    if intervals:
        avg_interval = sum(intervals) / len(intervals)
        
        if avg_interval <= 7:
            frequency = "very_frequent"
        elif avg_interval <= 30:
            frequency = "frequent"
        elif avg_interval <= 90:
            frequency = "regular"
        else:
            frequency = "infrequent"
        
        return {
            "frequency": frequency,
            "average_interval_days": avg_interval,
            "total_consultations": len(consultations),
            "last_consultation": consultations[-1].get("created_at")
        }
    
    return {"frequency": "no_data"}

def calculate_risk_trends(consultations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate health risk trends from consultations"""
    risk_conditions = ["diabetes", "hypertension", "heart disease", "obesity"]
    trends = {}
    
    for condition in risk_conditions:
        condition_consultations = []
        for consultation in consultations:
            diagnoses = consultation.get("diagnoses", [])
            for diagnosis in diagnoses:
                if condition.lower() in diagnosis.get("condition", "").lower():
                    condition_consultations.append(consultation)
                    break
        
        trends[condition] = {
            "occurrences": len(condition_consultations),
            "trend": "stable"  # Simplified - would need more sophisticated analysis
        }
    
    return trends

def get_recent_diagnoses(consultations: List[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent diagnoses from consultations"""
    recent_diagnoses = []
    
    for consultation in consultations[:limit]:  # Already sorted by date desc
        diagnoses = consultation.get("diagnoses", [])
        for diagnosis in diagnoses:
            recent_diagnoses.append({
                "condition": diagnosis.get("condition"),
                "confidence": diagnosis.get("confidence"),
                "date": consultation.get("created_at"),
                "consultation_id": str(consultation.get("_id"))
            })
    
    return recent_diagnoses[:limit]

def calculate_medication_adherence(patient: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate medication adherence (simplified)"""
    medications = patient.get("current_medications", [])
    
    if not medications:
        return {"status": "no_medications"}
    
    # Simplified adherence calculation
    # In a real system, this would track actual medication taking vs prescribed
    return {
        "total_medications": len(medications),
        "adherence_score": 85.0,  # Placeholder
        "status": "good"
    }

async def analyze_age_groups(patients_collection, consultations_collection, start_date):
    """Analyze health trends by age groups"""
    # This would require joining patient and consultation data
    # Simplified implementation
    return {
        "18-30": {"consultations": 45, "common_conditions": ["anxiety", "allergies"]},
        "31-50": {"consultations": 78, "common_conditions": ["hypertension", "diabetes"]},
        "51-70": {"consultations": 92, "common_conditions": ["heart disease", "arthritis"]},
        "70+": {"consultations": 34, "common_conditions": ["multiple chronic conditions"]}
    }

def analyze_doctor_performance(doctor: Dict[str, Any], consultations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze individual doctor performance"""
    total_consultations = len(consultations)
    
    if total_consultations == 0:
        return {"status": "no_consultations"}
    
    # Calculate completion rate
    completed_consultations = len([c for c in consultations if c.get("status") == "completed"])
    completion_rate = (completed_consultations / total_consultations) * 100
    
    # Calculate average consultation duration
    durations = [c.get("duration_minutes") for c in consultations if c.get("duration_minutes")]
    avg_duration = sum(durations) / len(durations) if durations else 0
    
    # Patient satisfaction (would come from ratings in real system)
    patient_satisfaction = doctor.get("rating", 0) * 20  # Convert 5-star to percentage
    
    return {
        "total_consultations": total_consultations,
        "completion_rate": completion_rate,
        "average_duration_minutes": avg_duration,
        "patient_satisfaction": patient_satisfaction,
        "specializations": doctor.get("specializations", []),
        "years_experience": doctor.get("years_of_experience", 0)
    }
