from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from bson import ObjectId
from models.user import User, UserRole
from auth.security import get_current_active_user, require_roles
from database.connection import get_users_collection

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_users(
    role: Optional[str] = Query(None, description="Filter users by role (patient, doctor, admin)"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all users or filter by role
    Only accessible by doctors and admins
    """
    # Only doctors and admins can access user list
    if current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access user list"
        )
    
    try:
        users_collection = await get_users_collection()
        
        # Build query
        query = {}
        if role:
            # Validate role
            valid_roles = ["patient", "doctor", "admin"]
            if role.lower() not in valid_roles:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role. Must be one of: {valid_roles}"
                )
            query["role"] = role.lower()
        
        # Get users from database
        users_cursor = users_collection.find(query)
        users = await users_cursor.to_list(length=None)
        
        # Format response (remove sensitive data)
        formatted_users = []
        for user in users:
            formatted_user = {
                "_id": str(user["_id"]),
                "email": user.get("email", ""),
                "full_name": user.get("full_name", ""),
                "role": user.get("role", ""),
                "phone": user.get("phone", ""),
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at"),
                "last_login": user.get("last_login")
            }
            # Don't include sensitive data like hashed_password
            formatted_users.append(formatted_user)
        
        return formatted_users
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching users: {str(e)}"
        )

@router.get("/{user_id}", response_model=dict)
async def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific user by ID
    Only accessible by doctors and admins, or the user themselves
    """
    try:
        # Users can access their own data, doctors/admins can access any user
        if (current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN] and 
            str(current_user.id) != user_id):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this user's data"
            )
        
        users_collection = await get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Format response (remove sensitive data)
        formatted_user = {
            "_id": str(user["_id"]),
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "role": user.get("role", ""),
            "phone": user.get("phone", ""),
            "is_active": user.get("is_active", True),
            "date_of_birth": user.get("date_of_birth"),
            "address": user.get("address"),
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login")
        }
        
        return formatted_user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching user: {str(e)}"
        )
