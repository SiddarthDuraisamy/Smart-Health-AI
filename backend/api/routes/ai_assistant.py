"""
AI Assistant routes for health predictions and LLM chat
"""

from fastapi import APIRouter, HTTPException, status, Depends, Response
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
from bson import ObjectId
from datetime import datetime, timedelta
from pydantic import BaseModel

from models.user import User, UserRole
from models.patient import Patient
from models.consultation import ChatMessage, AIInsight
from auth.security import get_current_active_user, require_roles
from database.connection import get_patients_collection, get_consultations_collection
from ml.health_assistant import health_predictor
from ml.llm_engine import healthcare_llm

router = APIRouter()

def calculate_overall_health_score(risk_predictions: Dict[str, Any]) -> float:
    """Calculate overall health score from risk predictions"""
    try:
        risk_score = risk_predictions.get('risk_score', 0.2)
        # Convert risk score to health score (inverse relationship)
        health_score = max(0.1, min(1.0, 1.0 - risk_score))
        return round(health_score * 100, 1)  # Return as percentage
    except Exception:
        return 80.0  # Default good health score

# Add OPTIONS handler for CORS preflight
@router.options("/health-assessment")
async def health_assessment_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.post("/health-assessment")
async def get_health_assessment(
    current_user: User = Depends(get_current_active_user)
):
    """Get AI health risk assessment for current patient"""
    try:
        if current_user.role != UserRole.PATIENT:
            return JSONResponse(
                status_code=403,
                content={"detail": "Access denied. Patient role required."},
                headers={"Access-Control-Allow-Origin": "*"}
            )
        # Get patient data
        patients_collection = await get_patients_collection()
        patient = await patients_collection.find_one({"user_id": ObjectId(current_user.id)})
        
        # Create basic patient data if profile doesn't exist
        if not patient:
            patient_data = {
                'user_id': current_user.id,
                'date_of_birth': current_user.date_of_birth,
                'full_name': current_user.full_name,
                'gender': getattr(current_user, 'gender', 'not_specified'),
                'medical_history': [],
                'lifestyle_data': {},
                'vital_signs': []
            }
        else:
            # Add user data to existing patient data
            patient_data = dict(patient)
            patient_data.update({
                'date_of_birth': current_user.date_of_birth,
                'full_name': current_user.full_name
            })
        
        # Get risk predictions
        try:
            risk_predictions = health_predictor.predict_health_risks(patient_data)
        except Exception:
            # Return a basic assessment if ML prediction fails
            risk_predictions = {
                'overall_risk': 'low',
                'risk_score': 0.2,
                'risk_factors': ['No significant risk factors identified'],
                'recommendations': ['Maintain a healthy lifestyle', 'Regular check-ups recommended']
            }
        
        # Generate recommendations
        try:
            recommendations = health_predictor.generate_recommendations(patient_data, risk_predictions)
        except Exception:
            recommendations = [
                "Maintain a balanced diet with plenty of fruits and vegetables",
                "Exercise regularly - aim for 30 minutes of moderate activity daily",
                "Get adequate sleep (7-9 hours per night)",
                "Stay hydrated and limit alcohol consumption",
                "Schedule regular health check-ups"
            ]
        
        # Get patient ID safely
        patient_id = str(patient["_id"]) if patient and "_id" in patient else current_user.id
        
        response_data = {
            "patient_id": patient_id,
            "assessment_date": datetime.utcnow().isoformat(),
            "risk_predictions": risk_predictions,
            "recommendations": recommendations,
            "overall_health_score": calculate_overall_health_score(risk_predictions),
            "next_assessment_due": (datetime.utcnow() + timedelta(days=90)).isoformat()
        }
        
        return JSONResponse(
            content=response_data,
            headers={"Access-Control-Allow-Origin": "*"}
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Health assessment temporarily unavailable",
                "error": "Please try again later"
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    consultation_id: Optional[str] = None

@router.post("/chat", response_model=Dict[str, Any])
async def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Chat with AI healthcare assistant"""
    # Get patient context if user is a patient
    patient_context = None
    if current_user.role == UserRole.PATIENT:
        patients_collection = await get_patients_collection()
        patient = await patients_collection.find_one({"user_id": ObjectId(current_user.id)})
        if patient:
            patient_context = dict(patient)
            patient_context.update({
                'date_of_birth': current_user.date_of_birth,
                'full_name': current_user.full_name
            })
    
    # Get conversation history if consultation_id is provided
    conversation_history = []
    if request.consultation_id:
        consultations_collection = await get_consultations_collection()
        try:
            consultation = await consultations_collection.find_one({"_id": ObjectId(request.consultation_id)})
            if consultation:
                conversation_history = consultation.get("chat_messages", [])
        except Exception:
            pass  # Invalid consultation_id, continue without history
    
    # Generate AI response
    ai_response = await healthcare_llm.chat_with_patient(
        message=request.message,
        patient_context=patient_context,
        conversation_history=conversation_history,
        language=request.language
    )
    
    # Save chat message to consultation if consultation_id is provided
    if request.consultation_id and ai_response:
        try:
            consultations_collection = await get_consultations_collection()
            
            # Add user message
            user_message = ChatMessage(
                sender=str(current_user.id),
                message=request.message,
                language=request.language
            )
            
            # Add AI response
            ai_message = ChatMessage(
                sender="ai",
                message=ai_response["response"],
                language=request.language
            )
            
            await consultations_collection.update_one(
                {"_id": ObjectId(request.consultation_id)},
                {
                    "$push": {
                        "chat_messages": {
                            "$each": [user_message.dict(), ai_message.dict()]
                        }
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        except Exception as e:
            # Log error but don't fail the chat response
            pass
    
    return ai_response

@router.post("/analyze-symptoms", response_model=Dict[str, Any])
async def analyze_symptoms(
    symptoms: List[str],
    additional_info: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Analyze symptoms and provide AI insights"""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient role required."
        )
    
    # Get patient context
    patients_collection = await get_patients_collection()
    patient = await patients_collection.find_one({"user_id": ObjectId(current_user.id)})
    
    patient_context = None
    if patient:
        patient_context = dict(patient)
        patient_context.update({
            'date_of_birth': current_user.date_of_birth,
            'full_name': current_user.full_name
        })
    
    # Create symptom analysis prompt
    symptoms_text = ", ".join(symptoms)
    analysis_prompt = f"I'm experiencing the following symptoms: {symptoms_text}"
    if additional_info:
        analysis_prompt += f". Additional information: {additional_info}"
    
    # Get AI analysis
    ai_response = await healthcare_llm.chat_with_patient(
        message=analysis_prompt,
        patient_context=patient_context
    )
    
    # Generate urgency assessment
    urgency_level = assess_symptom_urgency(symptoms)
    
    return {
        "symptoms_analyzed": symptoms,
        "ai_analysis": ai_response["response"],
        "urgency_level": urgency_level,
        "recommendations": generate_symptom_recommendations(symptoms, urgency_level),
        "should_seek_immediate_care": urgency_level in ["high", "emergency"],
        "analysis_timestamp": datetime.utcnow()
    }

@router.post("/consultation-summary", response_model=Dict[str, Any])
async def generate_consultation_summary(
    consultation_id: str,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Generate AI summary of consultation"""
    consultations_collection = await get_consultations_collection()
    
    try:
        consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consultation ID"
        )
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    # Generate AI summary
    summary = await healthcare_llm.generate_consultation_summary(consultation)
    
    # Save summary to consultation
    await consultations_collection.update_one(
        {"_id": ObjectId(consultation_id)},
        {
            "$set": {
                "ai_summary": summary,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "consultation_id": consultation_id,
        "summary": summary,
        "generated_at": datetime.utcnow(),
        "generated_by": "ai"
    }

@router.get("/health-insights/{patient_id}", response_model=Dict[str, Any])
async def get_patient_health_insights(
    patient_id: str,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Get AI health insights for a specific patient (doctors/admins only)"""
    patients_collection = await get_patients_collection()
    
    try:
        patient = await patients_collection.find_one({"_id": ObjectId(patient_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient ID"
        )
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Get risk predictions
    risk_predictions = health_predictor.predict_health_risks(patient)
    
    # Generate recommendations
    recommendations = health_predictor.generate_recommendations(patient, risk_predictions)
    
    # Analyze trends (simplified)
    trends = analyze_health_trends(patient)
    
    return {
        "patient_id": patient_id,
        "risk_predictions": risk_predictions,
        "recommendations": recommendations,
        "health_trends": trends,
        "overall_health_score": calculate_overall_health_score(risk_predictions),
        "analysis_date": datetime.utcnow()
    }

def calculate_overall_health_score(risk_predictions: Dict[str, Any]) -> float:
    """Calculate overall health score from risk predictions"""
    total_risk = 0
    count = 0
    
    for condition, risk_data in risk_predictions.items():
        total_risk += risk_data["probability"]
        count += 1
    
    if count == 0:
        return 85.0  # Default good health score
    
    average_risk = total_risk / count
    # Convert risk to health score (inverse relationship)
    health_score = (1 - average_risk) * 100
    
    return round(health_score, 1)

def assess_symptom_urgency(symptoms: List[str]) -> str:
    """Assess urgency level of symptoms"""
    emergency_symptoms = [
        "chest pain", "difficulty breathing", "severe bleeding", "loss of consciousness",
        "severe headache", "stroke symptoms", "heart attack", "severe allergic reaction"
    ]
    
    high_urgency_symptoms = [
        "high fever", "severe pain", "persistent vomiting", "severe dizziness",
        "difficulty swallowing", "severe abdominal pain"
    ]
    
    symptoms_lower = [s.lower() for s in symptoms]
    
    for symptom in symptoms_lower:
        if any(emergency in symptom for emergency in emergency_symptoms):
            return "emergency"
    
    for symptom in symptoms_lower:
        if any(high_urgency in symptom for high_urgency in high_urgency_symptoms):
            return "high"
    
    if len(symptoms) > 3:
        return "medium"
    
    return "low"

def generate_symptom_recommendations(symptoms: List[str], urgency_level: str) -> List[str]:
    """Generate recommendations based on symptoms and urgency"""
    recommendations = []
    
    if urgency_level == "emergency":
        recommendations.append("Seek immediate emergency medical care")
        recommendations.append("Call emergency services if symptoms are severe")
    elif urgency_level == "high":
        recommendations.append("Contact your healthcare provider today")
        recommendations.append("Monitor symptoms closely")
    elif urgency_level == "medium":
        recommendations.append("Schedule an appointment with your healthcare provider within a few days")
        recommendations.append("Keep track of symptom progression")
    else:
        recommendations.append("Monitor symptoms and consult healthcare provider if they persist")
        recommendations.append("Consider rest and self-care measures")
    
    # Add general recommendations
    recommendations.extend([
        "Stay hydrated",
        "Get adequate rest",
        "Avoid strenuous activities if feeling unwell"
    ])
    
    return recommendations

def analyze_health_trends(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze health trends from patient data"""
    trends = {
        "vital_signs_trend": "stable",
        "weight_trend": "stable",
        "blood_pressure_trend": "stable",
        "overall_trend": "stable"
    }
    
    vital_signs_history = patient_data.get("vital_signs_history", [])
    
    if len(vital_signs_history) >= 2:
        # Simple trend analysis (would be more sophisticated in production)
        recent_vitals = vital_signs_history[-3:]  # Last 3 readings
        
        # Analyze weight trend
        weights = [vs.get("weight") for vs in recent_vitals if vs.get("weight")]
        if len(weights) >= 2:
            if weights[-1] > weights[0] * 1.05:
                trends["weight_trend"] = "increasing"
            elif weights[-1] < weights[0] * 0.95:
                trends["weight_trend"] = "decreasing"
        
        # Analyze blood pressure trend
        systolic_readings = [vs.get("blood_pressure_systolic") for vs in recent_vitals if vs.get("blood_pressure_systolic")]
        if len(systolic_readings) >= 2:
            if systolic_readings[-1] > systolic_readings[0] + 10:
                trends["blood_pressure_trend"] = "increasing"
            elif systolic_readings[-1] < systolic_readings[0] - 10:
                trends["blood_pressure_trend"] = "decreasing"
    
    return trends
