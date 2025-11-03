"""
Seed data for Smart Health Consulting Services database
"""

import asyncio
import os
from datetime import datetime, timedelta
from bson import ObjectId
import random
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from database.connection import (
    get_users_collection, get_patients_collection, get_doctors_collection,
    get_consultations_collection, get_blockchain_ledger_collection
)
from auth.security import get_password_hash
from models.user import UserRole
from models.patient import Gender, BloodType, VitalSigns, LifestyleData, MedicalHistory, Allergy
from models.doctor import Specialization, Qualification, Experience, Availability
from models.consultation import ConsultationType, ConsultationStatus, Priority, Symptom, Diagnosis
from blockchain.ledger import health_blockchain

async def create_sample_users():
    """Create sample users (patients, doctors, admins)"""
    users_collection = await get_users_collection()
    
    # Clear existing users
    await users_collection.delete_many({})
    
    sample_users = [
        # Admin user
        {
            "email": "admin@smarthealth.com",
            "full_name": "System Administrator",
            "role": UserRole.ADMIN,
            "hashed_password": get_password_hash("admin123"),
            "is_active": True,
            "phone": "+1-555-0001",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        # Sample patients
        {
            "email": "john.doe@email.com",
            "full_name": "John Doe",
            "role": UserRole.PATIENT,
            "hashed_password": get_password_hash("patient123"),
            "is_active": True,
            "phone": "+1-555-0101",
            "date_of_birth": datetime(1985, 3, 15),
            "address": "123 Main St, Anytown, USA",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "jane.smith@email.com",
            "full_name": "Jane Smith",
            "role": UserRole.PATIENT,
            "hashed_password": get_password_hash("patient123"),
            "is_active": True,
            "phone": "+1-555-0102",
            "date_of_birth": datetime(1990, 7, 22),
            "address": "456 Oak Ave, Somewhere, USA",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "mike.johnson@email.com",
            "full_name": "Mike Johnson",
            "role": UserRole.PATIENT,
            "hashed_password": get_password_hash("patient123"),
            "is_active": True,
            "phone": "+1-555-0103",
            "date_of_birth": datetime(1978, 11, 8),
            "address": "789 Pine Rd, Elsewhere, USA",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        # Sample doctors
        {
            "email": "dr.sarah.wilson@hospital.com",
            "full_name": "Dr. Sarah Wilson",
            "role": UserRole.DOCTOR,
            "hashed_password": get_password_hash("doctor123"),
            "is_active": True,
            "phone": "+1-555-0201",
            "date_of_birth": datetime(1975, 5, 12),
            "address": "Medical Center, 100 Health St, Medical City, USA",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "dr.robert.chen@hospital.com",
            "full_name": "Dr. Robert Chen",
            "role": UserRole.DOCTOR,
            "hashed_password": get_password_hash("doctor123"),
            "is_active": True,
            "phone": "+1-555-0202",
            "date_of_birth": datetime(1970, 9, 25),
            "address": "Cardiology Clinic, 200 Heart Ave, Medical City, USA",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "dr.maria.garcia@hospital.com",
            "full_name": "Dr. Maria Garcia",
            "role": UserRole.DOCTOR,
            "hashed_password": get_password_hash("doctor123"),
            "is_active": True,
            "phone": "+1-555-0203",
            "date_of_birth": datetime(1980, 1, 18),
            "address": "Pediatric Center, 300 Kids Way, Medical City, USA",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    result = await users_collection.insert_many(sample_users)
    print(f"Created {len(result.inserted_ids)} sample users")
    return result.inserted_ids

async def create_sample_patients(user_ids):
    """Create sample patient profiles"""
    patients_collection = await get_patients_collection()
    
    # Clear existing patients
    await patients_collection.delete_many({})
    
    # Get patient user IDs (skip admin and doctors)
    patient_user_ids = user_ids[1:4]  # John, Jane, Mike
    
    sample_patients = []
    
    # John Doe - Patient with diabetes history
    john_vitals = [
        VitalSigns(
            timestamp=datetime.utcnow() - timedelta(days=30),
            blood_pressure_systolic=135,
            blood_pressure_diastolic=85,
            heart_rate=78,
            weight=85.5,
            height=175,
            blood_glucose=145
        ),
        VitalSigns(
            timestamp=datetime.utcnow() - timedelta(days=15),
            blood_pressure_systolic=130,
            blood_pressure_diastolic=82,
            heart_rate=75,
            weight=84.8,
            height=175,
            blood_glucose=138
        ),
        VitalSigns(
            timestamp=datetime.utcnow() - timedelta(days=1),
            blood_pressure_systolic=128,
            blood_pressure_diastolic=80,
            heart_rate=72,
            weight=84.2,
            height=175,
            blood_glucose=132
        )
    ]
    
    john_patient = {
        "user_id": patient_user_ids[0],
        "medical_record_number": "MRN12345678",
        "gender": Gender.MALE,
        "blood_type": BloodType.A_POSITIVE,
        "medical_history": [
            MedicalHistory(
                condition="Type 2 Diabetes",
                diagnosed_date=datetime(2020, 6, 15),
                status="active",
                notes="Well controlled with medication"
            ).dict(),
            MedicalHistory(
                condition="Hypertension",
                diagnosed_date=datetime(2019, 3, 10),
                status="active",
                notes="Mild, managed with lifestyle changes"
            ).dict()
        ],
        "allergies": [
            Allergy(
                allergen="Penicillin",
                severity="moderate",
                reaction="Skin rash",
                notes="Avoid all penicillin-based antibiotics"
            ).dict()
        ],
        "lifestyle_data": LifestyleData(
            smoking_status="never",
            alcohol_consumption="light",
            exercise_frequency="weekly",
            diet_type="balanced",
            sleep_hours=7.5,
            stress_level=4
        ).dict(),
        "vital_signs_history": [vs.dict() for vs in john_vitals],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    sample_patients.append(john_patient)
    
    # Jane Smith - Healthy young patient
    jane_vitals = [
        VitalSigns(
            timestamp=datetime.utcnow() - timedelta(days=20),
            blood_pressure_systolic=118,
            blood_pressure_diastolic=75,
            heart_rate=68,
            weight=62.3,
            height=165,
            blood_glucose=95
        ),
        VitalSigns(
            timestamp=datetime.utcnow() - timedelta(days=5),
            blood_pressure_systolic=115,
            blood_pressure_diastolic=72,
            heart_rate=65,
            weight=62.1,
            height=165,
            blood_glucose=92
        )
    ]
    
    jane_patient = {
        "user_id": patient_user_ids[1],
        "medical_record_number": "MRN23456789",
        "gender": Gender.FEMALE,
        "blood_type": BloodType.O_NEGATIVE,
        "medical_history": [],
        "allergies": [
            Allergy(
                allergen="Shellfish",
                severity="severe",
                reaction="Anaphylaxis",
                notes="Carries EpiPen at all times"
            ).dict()
        ],
        "lifestyle_data": LifestyleData(
            smoking_status="never",
            alcohol_consumption="none",
            exercise_frequency="daily",
            diet_type="vegetarian",
            sleep_hours=8.0,
            stress_level=3
        ).dict(),
        "vital_signs_history": [vs.dict() for vs in jane_vitals],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    sample_patients.append(jane_patient)
    
    # Mike Johnson - Patient with heart condition
    mike_vitals = [
        VitalSigns(
            timestamp=datetime.utcnow() - timedelta(days=25),
            blood_pressure_systolic=145,
            blood_pressure_diastolic=92,
            heart_rate=85,
            weight=92.1,
            height=180,
            blood_glucose=110
        ),
        VitalSigns(
            timestamp=datetime.utcnow() - timedelta(days=10),
            blood_pressure_systolic=140,
            blood_pressure_diastolic=88,
            heart_rate=82,
            weight=91.5,
            height=180,
            blood_glucose=105
        )
    ]
    
    mike_patient = {
        "user_id": patient_user_ids[2],
        "medical_record_number": "MRN34567890",
        "gender": Gender.MALE,
        "blood_type": BloodType.B_POSITIVE,
        "medical_history": [
            MedicalHistory(
                condition="Coronary Artery Disease",
                diagnosed_date=datetime(2021, 8, 20),
                status="active",
                notes="Stable, on medication"
            ).dict(),
            MedicalHistory(
                condition="High Cholesterol",
                diagnosed_date=datetime(2020, 12, 5),
                status="active",
                notes="Managed with statins"
            ).dict()
        ],
        "allergies": [],
        "lifestyle_data": LifestyleData(
            smoking_status="former",
            alcohol_consumption="moderate",
            exercise_frequency="weekly",
            diet_type="low-sodium",
            sleep_hours=6.5,
            stress_level=6
        ).dict(),
        "vital_signs_history": [vs.dict() for vs in mike_vitals],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    sample_patients.append(mike_patient)
    
    result = await patients_collection.insert_many(sample_patients)
    print(f"Created {len(result.inserted_ids)} sample patients")
    return result.inserted_ids

async def create_sample_doctors(user_ids):
    """Create sample doctor profiles"""
    doctors_collection = await get_doctors_collection()
    
    # Clear existing doctors
    await doctors_collection.delete_many({})
    
    # Get doctor user IDs
    doctor_user_ids = user_ids[4:7]  # Dr. Wilson, Dr. Chen, Dr. Garcia
    
    sample_doctors = []
    
    # Dr. Sarah Wilson - General Practice
    wilson_doctor = {
        "user_id": doctor_user_ids[0],
        "license_number": "LIC12345678",
        "specializations": [Specialization.GENERAL_PRACTICE],
        "qualifications": [
            Qualification(
                degree="MD",
                institution="Harvard Medical School",
                year=2000,
                country="USA"
            ).dict(),
            Qualification(
                degree="Residency in Family Medicine",
                institution="Massachusetts General Hospital",
                year=2003,
                country="USA"
            ).dict()
        ],
        "experience": [
            Experience(
                position="Senior Family Physician",
                hospital_clinic="City General Hospital",
                start_date=datetime(2010, 1, 1),
                description="Primary care physician with focus on preventive medicine"
            ).dict()
        ],
        "years_of_experience": 20,
        "consultation_fee": 150.0,
        "languages_spoken": ["English", "Spanish"],
        "availability": [
            Availability(day_of_week=1, start_time="09:00", end_time="17:00").dict(),
            Availability(day_of_week=2, start_time="09:00", end_time="17:00").dict(),
            Availability(day_of_week=3, start_time="09:00", end_time="17:00").dict(),
            Availability(day_of_week=4, start_time="09:00", end_time="17:00").dict(),
            Availability(day_of_week=5, start_time="09:00", end_time="15:00").dict()
        ],
        "bio": "Dr. Wilson is a board-certified family physician with over 20 years of experience in primary care and preventive medicine.",
        "hospital_affiliations": ["City General Hospital", "Community Health Center"],
        "certifications": ["Board Certified Family Medicine", "Advanced Cardiac Life Support"],
        "rating": 4.8,
        "total_consultations": 1250,
        "is_verified": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    sample_doctors.append(wilson_doctor)
    
    # Dr. Robert Chen - Cardiology
    chen_doctor = {
        "user_id": doctor_user_ids[1],
        "license_number": "LIC23456789",
        "specializations": [Specialization.CARDIOLOGY],
        "qualifications": [
            Qualification(
                degree="MD",
                institution="Johns Hopkins University",
                year=1995,
                country="USA"
            ).dict(),
            Qualification(
                degree="Cardiology Fellowship",
                institution="Mayo Clinic",
                year=2000,
                country="USA"
            ).dict()
        ],
        "experience": [
            Experience(
                position="Chief of Cardiology",
                hospital_clinic="Heart Institute",
                start_date=datetime(2005, 6, 1),
                description="Leading cardiologist specializing in interventional cardiology"
            ).dict()
        ],
        "years_of_experience": 25,
        "consultation_fee": 300.0,
        "languages_spoken": ["English", "Mandarin"],
        "availability": [
            Availability(day_of_week=1, start_time="08:00", end_time="16:00").dict(),
            Availability(day_of_week=2, start_time="08:00", end_time="16:00").dict(),
            Availability(day_of_week=3, start_time="08:00", end_time="16:00").dict(),
            Availability(day_of_week=4, start_time="08:00", end_time="16:00").dict()
        ],
        "bio": "Dr. Chen is a renowned interventional cardiologist with expertise in complex cardiac procedures and heart disease prevention.",
        "hospital_affiliations": ["Heart Institute", "University Medical Center"],
        "certifications": ["Board Certified Cardiology", "Interventional Cardiology"],
        "rating": 4.9,
        "total_consultations": 890,
        "is_verified": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    sample_doctors.append(chen_doctor)
    
    # Dr. Maria Garcia - Pediatrics
    garcia_doctor = {
        "user_id": doctor_user_ids[2],
        "license_number": "LIC34567890",
        "specializations": [Specialization.PEDIATRICS],
        "qualifications": [
            Qualification(
                degree="MD",
                institution="Stanford University School of Medicine",
                year=2005,
                country="USA"
            ).dict(),
            Qualification(
                degree="Pediatrics Residency",
                institution="Children's Hospital of Philadelphia",
                year=2008,
                country="USA"
            ).dict()
        ],
        "experience": [
            Experience(
                position="Pediatrician",
                hospital_clinic="Children's Medical Center",
                start_date=datetime(2008, 7, 1),
                description="Pediatrician specializing in child development and preventive care"
            ).dict()
        ],
        "years_of_experience": 15,
        "consultation_fee": 200.0,
        "languages_spoken": ["English", "Spanish", "Portuguese"],
        "availability": [
            Availability(day_of_week=1, start_time="10:00", end_time="18:00").dict(),
            Availability(day_of_week=2, start_time="10:00", end_time="18:00").dict(),
            Availability(day_of_week=3, start_time="10:00", end_time="18:00").dict(),
            Availability(day_of_week=4, start_time="10:00", end_time="18:00").dict(),
            Availability(day_of_week=5, start_time="10:00", end_time="16:00").dict()
        ],
        "bio": "Dr. Garcia is a compassionate pediatrician dedicated to providing comprehensive care for children from infancy through adolescence.",
        "hospital_affiliations": ["Children's Medical Center", "Pediatric Specialty Clinic"],
        "certifications": ["Board Certified Pediatrics", "Pediatric Advanced Life Support"],
        "rating": 4.7,
        "total_consultations": 650,
        "is_verified": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    sample_doctors.append(garcia_doctor)
    
    result = await doctors_collection.insert_many(sample_doctors)
    print(f"Created {len(result.inserted_ids)} sample doctors")
    return result.inserted_ids

async def create_sample_consultations(patient_ids, doctor_ids):
    """Create sample consultations"""
    consultations_collection = await get_consultations_collection()
    
    # Clear existing consultations
    await consultations_collection.delete_many({})
    
    sample_consultations = []
    
    # Consultation 1: John Doe with Dr. Wilson (completed)
    consultation1 = {
        "patient_id": patient_ids[0],
        "doctor_id": doctor_ids[0],
        "consultation_type": ConsultationType.FOLLOW_UP,
        "status": ConsultationStatus.COMPLETED,
        "priority": Priority.MEDIUM,
        "scheduled_at": datetime.utcnow() - timedelta(days=7),
        "started_at": datetime.utcnow() - timedelta(days=7, hours=-1),
        "completed_at": datetime.utcnow() - timedelta(days=7, minutes=-30),
        "duration_minutes": 30,
        "chief_complaint": "Follow-up for diabetes management",
        "symptoms": [
            Symptom(
                name="Increased thirst",
                severity=3,
                duration="2 weeks",
                description="Mild increase in thirst, especially in the morning"
            ).dict(),
            Symptom(
                name="Fatigue",
                severity=4,
                duration="1 week",
                description="Feeling more tired than usual after meals"
            ).dict()
        ],
        "diagnoses": [
            Diagnosis(
                condition="Type 2 Diabetes - Well Controlled",
                confidence=0.95,
                notes="Blood glucose levels improving with current medication",
                suggested_by=str(doctor_ids[0])
            ).dict()
        ],
        "ai_summary": "Patient showing good progress in diabetes management. Blood glucose levels have improved. Continue current medication regimen with lifestyle modifications.",
        "consultation_fee": 150.0,
        "payment_status": "completed",
        "created_at": datetime.utcnow() - timedelta(days=7),
        "updated_at": datetime.utcnow() - timedelta(days=7)
    }
    sample_consultations.append(consultation1)
    
    # Consultation 2: Mike Johnson with Dr. Chen (completed)
    consultation2 = {
        "patient_id": patient_ids[2],
        "doctor_id": doctor_ids[1],
        "consultation_type": ConsultationType.INITIAL,
        "status": ConsultationStatus.COMPLETED,
        "priority": Priority.HIGH,
        "scheduled_at": datetime.utcnow() - timedelta(days=3),
        "started_at": datetime.utcnow() - timedelta(days=3, hours=-1),
        "completed_at": datetime.utcnow() - timedelta(days=3, minutes=-45),
        "duration_minutes": 45,
        "chief_complaint": "Chest pain and shortness of breath",
        "symptoms": [
            Symptom(
                name="Chest pain",
                severity=6,
                duration="3 days",
                description="Sharp pain in center of chest, worse with exertion"
            ).dict(),
            Symptom(
                name="Shortness of breath",
                severity=5,
                duration="2 days",
                description="Difficulty breathing during physical activity"
            ).dict()
        ],
        "diagnoses": [
            Diagnosis(
                condition="Stable Angina",
                confidence=0.85,
                notes="EKG shows minor changes consistent with stable angina",
                suggested_by=str(doctor_ids[1])
            ).dict()
        ],
        "ai_summary": "Patient presents with symptoms consistent with stable angina. Recommended cardiac stress test and medication adjustment. Follow-up in 2 weeks.",
        "consultation_fee": 300.0,
        "payment_status": "completed",
        "created_at": datetime.utcnow() - timedelta(days=3),
        "updated_at": datetime.utcnow() - timedelta(days=3)
    }
    sample_consultations.append(consultation2)
    
    # Consultation 3: Jane Smith with Dr. Wilson (scheduled)
    consultation3 = {
        "patient_id": patient_ids[1],
        "doctor_id": doctor_ids[0],
        "consultation_type": ConsultationType.INITIAL,
        "status": ConsultationStatus.SCHEDULED,
        "priority": Priority.LOW,
        "scheduled_at": datetime.utcnow() + timedelta(days=2),
        "chief_complaint": "Annual wellness check-up",
        "symptoms": [],
        "consultation_fee": 150.0,
        "payment_status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    sample_consultations.append(consultation3)
    
    result = await consultations_collection.insert_many(sample_consultations)
    print(f"Created {len(result.inserted_ids)} sample consultations")
    return result.inserted_ids

async def initialize_blockchain():
    """Initialize blockchain with genesis block"""
    await health_blockchain.initialize_blockchain()
    print("Blockchain initialized with genesis block")

async def seed_database():
    """Main function to seed the entire database"""
    print("Starting database seeding...")
    
    try:
        # Initialize database connection
        from database.connection import connect_to_mongo, close_mongo_connection
        await connect_to_mongo()
        print("✅ Database connection established")
        
        # Create users
        user_ids = await create_sample_users()
        
        # Create patients
        patient_ids = await create_sample_patients(user_ids)
        
        # Create doctors
        doctor_ids = await create_sample_doctors(user_ids)
        
        # Create consultations
        consultation_ids = await create_sample_consultations(patient_ids, doctor_ids)
        
        # Initialize blockchain
        await initialize_blockchain()
        
        print("\n✅ Database seeding completed successfully!")
        print(f"Created:")
        print(f"  - {len(user_ids)} users")
        print(f"  - {len(patient_ids)} patients")
        print(f"  - {len(doctor_ids)} doctors")
        print(f"  - {len(consultation_ids)} consultations")
        print(f"  - Blockchain initialized")
        
        print("\n🔐 Sample Login Credentials:")
        print("Admin: admin@smarthealth.com / admin123")
        print("Patient: john.doe@email.com / patient123")
        print("Doctor: dr.sarah.wilson@hospital.com / doctor123")
        
        # Close database connection
        await close_mongo_connection()
        print("✅ Database connection closed")
        
    except Exception as e:
        print(f"❌ Error during database seeding: {e}")
        # Close connection on error too
        try:
            await close_mongo_connection()
        except:
            pass
        raise e

if __name__ == "__main__":
    asyncio.run(seed_database())
