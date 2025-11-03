"""
Authentication routes for user registration, login, and token management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
from typing import Any

from models.user import User, UserCreate, UserInDB, Token, UserRole
from auth.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from database.connection import get_users_collection, get_patients_collection, get_doctors_collection
from models.patient import PatientCreate, PatientInDB
from models.doctor import DoctorCreate, DoctorInDB
import secrets
import string

router = APIRouter()

async def authenticate_user(email: str, password: str):
    """Authenticate user with email and password"""
    users_collection = await get_users_collection()
    user = await users_collection.find_one({"email": email})
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return UserInDB(**user)

def generate_medical_record_number():
    """Generate unique medical record number"""
    return "MRN" + ''.join(secrets.choice(string.digits) for _ in range(8))

def generate_license_number():
    """Generate unique license number"""
    return "LIC" + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

@router.options("/register")
async def register_options():
    """Handle OPTIONS request for register endpoint"""
    from fastapi import Response
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return {"message": "OPTIONS allowed"}

@router.post("/test-register")
async def test_register(user_data: UserCreate):
    """Test register endpoint without database"""
    return {
        "message": "Test registration successful",
        "email": user_data.email,
        "role": user_data.role,
        "name": user_data.full_name
    }

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        users_collection = await get_users_collection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.model_dump()
    del user_dict["password"]
    user_dict["hashed_password"] = hashed_password
    
    user_in_db = UserInDB(**user_dict)
    result = await users_collection.insert_one(user_in_db.model_dump(by_alias=True))
    user_id = result.inserted_id
    
    # Create role-specific profile
    if user_data.role == UserRole.PATIENT:
        patients_collection = await get_patients_collection()
        patient_data = PatientCreate(
            user_id=user_id,
            medical_record_number=generate_medical_record_number(),
            gender="other"  # Will be updated in profile
        )
        await patients_collection.insert_one(PatientInDB(**patient_data.model_dump()).model_dump(by_alias=True))
    
    elif user_data.role == UserRole.DOCTOR:
        doctors_collection = await get_doctors_collection()
        doctor_data = DoctorCreate(
            user_id=user_id,
            license_number=generate_license_number(),
            specializations=["general_practice"],
            qualifications=[],
            years_of_experience=0,
            consultation_fee=100.0
        )
        await doctors_collection.insert_one(DoctorInDB(**doctor_data.model_dump()).model_dump(by_alias=True))
    
    return {
        "message": "User registered successfully",
        "user_id": str(user_id),
        "role": user_data.role
    }

@router.post("/login", response_model=Token)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login user and return access token"""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    # Update last login
    users_collection = await get_users_collection()
    await users_collection.update_one(
        {"_id": user.id},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    print(f"🔍 /me endpoint called for user: {current_user.email}")
    print(f"🔍 User ID: {current_user.id}")
    print(f"🔍 User object: {current_user}")
    return current_user

@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(current_user: User = Depends(get_current_active_user)):
    """Refresh access token"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email, "role": current_user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout_user(current_user: User = Depends(get_current_active_user)):
    """Logout user (client should discard token)"""
    return {"message": "Successfully logged out"}
