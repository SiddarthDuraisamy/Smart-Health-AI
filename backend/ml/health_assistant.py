"""
AI Health Assistant - Core ML module for health recommendations and analysis
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class HealthRiskPredictor:
    """ML model for predicting health risks based on patient data"""
    
    def __init__(self):
        self.diabetes_model = None
        self.hypertension_model = None
        self.heart_disease_model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        
    def prepare_features(self, patient_data: Dict[str, Any]) -> np.ndarray:
        """Prepare features from patient data for ML models"""
        features = []
        
        # Basic demographics
        age = self._calculate_age(patient_data.get('date_of_birth'))
        features.append(age)
        
        # Gender encoding
        gender = patient_data.get('gender', 'other')
        gender_encoded = 1 if gender == 'male' else (2 if gender == 'female' else 0)
        features.append(gender_encoded)
        
        # Vital signs (latest readings)
        vital_signs = patient_data.get('vital_signs_history', [])
        if vital_signs:
            latest_vitals = vital_signs[-1]
            features.extend([
                latest_vitals.get('blood_pressure_systolic', 120),
                latest_vitals.get('blood_pressure_diastolic', 80),
                latest_vitals.get('heart_rate', 70),
                latest_vitals.get('weight', 70),
                latest_vitals.get('height', 170),
                latest_vitals.get('blood_glucose', 100)
            ])
        else:
            # Default values if no vital signs
            features.extend([120, 80, 70, 70, 170, 100])
        
        # Lifestyle factors
        lifestyle = patient_data.get('lifestyle_data', {}) or {}  # Handle None case
        smoking_score = self._encode_smoking_status(lifestyle.get('smoking_status', 'never'))
        alcohol_score = self._encode_alcohol_consumption(lifestyle.get('alcohol_consumption', 'none'))
        exercise_score = self._encode_exercise_frequency(lifestyle.get('exercise_frequency', 'weekly'))
        
        features.extend([
            smoking_score,
            alcohol_score,
            exercise_score,
            lifestyle.get('sleep_hours', 8),
            lifestyle.get('stress_level', 5)
        ])
        
        # Medical history indicators
        medical_history = patient_data.get('medical_history', []) or []  # Handle None case
        has_diabetes_history = any('diabetes' in condition.get('condition', '').lower() for condition in medical_history if isinstance(condition, dict))
        has_hypertension_history = any('hypertension' in condition.get('condition', '').lower() for condition in medical_history if isinstance(condition, dict))
        has_heart_disease_history = any('heart' in condition.get('condition', '').lower() for condition in medical_history if isinstance(condition, dict))
        
        features.extend([
            int(has_diabetes_history),
            int(has_hypertension_history),
            int(has_heart_disease_history)
        ])
        
        # Family history (placeholder - would need to be collected)
        features.extend([0, 0, 0])  # family_diabetes, family_hypertension, family_heart_disease
        
        return np.array(features).reshape(1, -1)
    
    def _calculate_age(self, date_of_birth) -> int:
        """Calculate age from date of birth"""
        if not date_of_birth:
            return 35  # Default age
        
        if isinstance(date_of_birth, str):
            try:
                dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))
            except:
                return 35
        else:
            dob = date_of_birth
            
        return (datetime.now() - dob).days // 365
    
    def _encode_smoking_status(self, status: str) -> int:
        """Encode smoking status to numerical value"""
        mapping = {'never': 0, 'former': 1, 'current': 2}
        return mapping.get(status.lower(), 0)
    
    def _encode_alcohol_consumption(self, consumption: str) -> int:
        """Encode alcohol consumption to numerical value"""
        mapping = {'none': 0, 'light': 1, 'moderate': 2, 'heavy': 3}
        return mapping.get(consumption.lower(), 0)
    
    def _encode_exercise_frequency(self, frequency: str) -> int:
        """Encode exercise frequency to numerical value"""
        mapping = {'never': 0, 'rarely': 1, 'monthly': 2, 'weekly': 3, 'daily': 4}
        return mapping.get(frequency.lower(), 2)
    
    def generate_synthetic_training_data(self, n_samples: int = 1000) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
        """Generate synthetic training data for demonstration purposes"""
        np.random.seed(42)
        
        # Generate features
        age = np.random.normal(45, 15, n_samples).clip(18, 90)
        gender = np.random.choice([0, 1, 2], n_samples, p=[0.1, 0.45, 0.45])
        systolic_bp = np.random.normal(125, 20, n_samples).clip(90, 200)
        diastolic_bp = np.random.normal(80, 15, n_samples).clip(60, 120)
        heart_rate = np.random.normal(72, 12, n_samples).clip(50, 120)
        weight = np.random.normal(70, 15, n_samples).clip(40, 150)
        height = np.random.normal(170, 10, n_samples).clip(140, 200)
        glucose = np.random.normal(100, 25, n_samples).clip(70, 300)
        smoking = np.random.choice([0, 1, 2], n_samples, p=[0.6, 0.25, 0.15])
        alcohol = np.random.choice([0, 1, 2, 3], n_samples, p=[0.3, 0.4, 0.25, 0.05])
        exercise = np.random.choice([0, 1, 2, 3, 4], n_samples, p=[0.1, 0.15, 0.2, 0.4, 0.15])
        sleep_hours = np.random.normal(7.5, 1.5, n_samples).clip(4, 12)
        stress_level = np.random.choice(range(1, 11), n_samples)
        
        # Medical history flags
        diabetes_history = np.random.choice([0, 1], n_samples, p=[0.9, 0.1])
        hypertension_history = np.random.choice([0, 1], n_samples, p=[0.8, 0.2])
        heart_disease_history = np.random.choice([0, 1], n_samples, p=[0.95, 0.05])
        
        # Family history flags
        family_diabetes = np.random.choice([0, 1], n_samples, p=[0.85, 0.15])
        family_hypertension = np.random.choice([0, 1], n_samples, p=[0.75, 0.25])
        family_heart_disease = np.random.choice([0, 1], n_samples, p=[0.9, 0.1])
        
        X = np.column_stack([
            age, gender, systolic_bp, diastolic_bp, heart_rate, weight, height, glucose,
            smoking, alcohol, exercise, sleep_hours, stress_level,
            diabetes_history, hypertension_history, heart_disease_history,
            family_diabetes, family_hypertension, family_heart_disease
        ])
        
        # Generate target variables with realistic correlations
        diabetes_risk = (
            (glucose > 126) * 0.4 +
            (age > 45) * 0.2 +
            (weight > 80) * 0.15 +
            diabetes_history * 0.3 +
            family_diabetes * 0.2 +
            np.random.random(n_samples) * 0.3
        )
        y_diabetes = (diabetes_risk > 0.5).astype(int)
        
        hypertension_risk = (
            (systolic_bp > 140) * 0.4 +
            (diastolic_bp > 90) * 0.3 +
            (age > 50) * 0.2 +
            (smoking == 2) * 0.15 +
            hypertension_history * 0.3 +
            family_hypertension * 0.2 +
            np.random.random(n_samples) * 0.2
        )
        y_hypertension = (hypertension_risk > 0.5).astype(int)
        
        heart_disease_risk = (
            (age > 55) * 0.25 +
            (smoking == 2) * 0.2 +
            (systolic_bp > 140) * 0.15 +
            (exercise < 2) * 0.1 +
            heart_disease_history * 0.4 +
            family_heart_disease * 0.25 +
            np.random.random(n_samples) * 0.2
        )
        y_heart_disease = (heart_disease_risk > 0.4).astype(int)
        
        targets = {
            'diabetes': y_diabetes,
            'hypertension': y_hypertension,
            'heart_disease': y_heart_disease
        }
        
        return X, targets
    
    def train_models(self):
        """Train ML models on synthetic data"""
        logger.info("Generating synthetic training data...")
        X, y_dict = self.generate_synthetic_training_data(2000)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train diabetes model
        logger.info("Training diabetes prediction model...")
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_dict['diabetes'], test_size=0.2, random_state=42
        )
        self.diabetes_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.diabetes_model.fit(X_train, y_train)
        
        # Train hypertension model
        logger.info("Training hypertension prediction model...")
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_dict['hypertension'], test_size=0.2, random_state=42
        )
        self.hypertension_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.hypertension_model.fit(X_train, y_train)
        
        # Train heart disease model
        logger.info("Training heart disease prediction model...")
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_dict['heart_disease'], test_size=0.2, random_state=42
        )
        self.heart_disease_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.heart_disease_model.fit(X_train, y_train)
        
        self.is_trained = True
        logger.info("All models trained successfully!")
    
    def predict_health_risks(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict health risks for a patient"""
        if not self.is_trained:
            self.train_models()
        
        features = self.prepare_features(patient_data)
        features_scaled = self.scaler.transform(features)
        
        # Get predictions and probabilities
        diabetes_prob = self.diabetes_model.predict_proba(features_scaled)[0][1]
        hypertension_prob = self.hypertension_model.predict_proba(features_scaled)[0][1]
        heart_disease_prob = self.heart_disease_model.predict_proba(features_scaled)[0][1]
        
        # Generate risk levels
        def get_risk_level(prob):
            if prob < 0.3:
                return "Low"
            elif prob < 0.6:
                return "Moderate"
            else:
                return "High"
        
        return {
            "diabetes": {
                "probability": float(diabetes_prob),
                "risk_level": get_risk_level(diabetes_prob)
            },
            "hypertension": {
                "probability": float(hypertension_prob),
                "risk_level": get_risk_level(hypertension_prob)
            },
            "heart_disease": {
                "probability": float(heart_disease_prob),
                "risk_level": get_risk_level(heart_disease_prob)
            }
        }
    
    def generate_recommendations(self, patient_data: Dict[str, Any], risk_predictions: Dict[str, Any]) -> List[str]:
        """Generate personalized health recommendations"""
        recommendations = []
        
        # Analyze vital signs
        vital_signs = patient_data.get('vital_signs_history', [])
        if vital_signs:
            latest_vitals = vital_signs[-1]
            
            # Blood pressure recommendations
            systolic = latest_vitals.get('blood_pressure_systolic', 120)
            diastolic = latest_vitals.get('blood_pressure_diastolic', 80)
            
            if systolic > 140 or diastolic > 90:
                recommendations.append("Monitor blood pressure regularly and consider reducing sodium intake")
            
            # Weight recommendations
            weight = latest_vitals.get('weight', 70)
            height = latest_vitals.get('height', 170)
            if height > 0:
                bmi = weight / ((height / 100) ** 2)
                if bmi > 25:
                    recommendations.append("Consider a balanced diet and regular exercise to maintain healthy weight")
                elif bmi < 18.5:
                    recommendations.append("Consider consulting a nutritionist for healthy weight gain strategies")
        
        # Lifestyle recommendations
        lifestyle = patient_data.get('lifestyle_data', {})
        
        if lifestyle.get('smoking_status') == 'current':
            recommendations.append("Strongly consider smoking cessation programs for better health outcomes")
        
        if lifestyle.get('exercise_frequency') in ['never', 'rarely']:
            recommendations.append("Incorporate at least 150 minutes of moderate exercise per week")
        
        if lifestyle.get('sleep_hours', 8) < 6:
            recommendations.append("Aim for 7-9 hours of quality sleep per night")
        
        if lifestyle.get('stress_level', 5) > 7:
            recommendations.append("Consider stress management techniques like meditation or yoga")
        
        # Risk-specific recommendations
        for condition, risk_data in risk_predictions.items():
            if risk_data['risk_level'] == 'High':
                if condition == 'diabetes':
                    recommendations.append("Schedule regular blood glucose monitoring and consult an endocrinologist")
                elif condition == 'hypertension':
                    recommendations.append("Monitor blood pressure daily and follow a low-sodium diet")
                elif condition == 'heart_disease':
                    recommendations.append("Schedule a cardiovascular screening and follow heart-healthy lifestyle")
        
        # General recommendations
        recommendations.extend([
            "Maintain regular check-ups with your healthcare provider",
            "Stay hydrated with 8-10 glasses of water daily",
            "Include more fruits and vegetables in your diet"
        ])
        
        return recommendations[:8]  # Limit to top 8 recommendations

# Global instance
health_predictor = HealthRiskPredictor()
