"""
Notifications management routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models.user import User, UserRole
from auth.security import get_current_active_user, require_roles
from database.connection import get_users_collection

router = APIRouter()

# In-memory notification store (in production, use Redis or database)
notifications_store = {}

def serialize_notification(notification):
    """Convert notification to JSON-serializable format"""
    if notification.get('_id'):
        notification['_id'] = str(notification['_id'])
    if notification.get('created_at'):
        # Ensure we have a datetime object and convert to ISO format with Z suffix for UTC
        if isinstance(notification['created_at'], datetime):
            notification['created_at'] = notification['created_at'].isoformat() + 'Z'
        else:
            # If it's already a string, ensure it has Z suffix
            if not notification['created_at'].endswith('Z'):
                notification['created_at'] = notification['created_at'] + 'Z'
    return notification

@router.post("/send")
async def send_notification(
    notification_data: dict,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Send notification to a patient"""
    try:
        patient_id = notification_data.get("patient_id")
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient ID is required"
            )
        
        # Create notification
        notification = {
            "_id": str(ObjectId()),
            "patient_id": patient_id,
            "title": notification_data.get("title", "New Notification"),
            "message": notification_data.get("message", ""),
            "type": notification_data.get("type", "appointment"),
            "from_doctor": current_user.full_name,
            "from_doctor_id": str(current_user.id),
            "read": False,
            "created_at": datetime.utcnow()
        }
        
        # Store notification (in production, save to database)
        if patient_id not in notifications_store:
            notifications_store[patient_id] = []
        
        notifications_store[patient_id].append(notification)
        
        print(f"📧 NOTIFICATION SENT: {notification['title']} to patient {patient_id}")
        print(f"Message: {notification['message']}")
        
        return {
            "message": "Notification sent successfully",
            "notification_id": notification["_id"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}"
        )

@router.get("/my-notifications")
async def get_my_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_active_user)
):
    """Get notifications for current user"""
    try:
        patient_id = str(current_user.id)
        user_notifications = notifications_store.get(patient_id, [])
        
        if unread_only:
            user_notifications = [n for n in user_notifications if not n.get("read", False)]
        
        # Sort by created_at descending
        user_notifications.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
        
        # Serialize notifications
        serialized_notifications = [serialize_notification(n.copy()) for n in user_notifications]
        
        return {
            "notifications": serialized_notifications,
            "unread_count": len([n for n in user_notifications if not n.get("read", False)])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notifications: {str(e)}"
        )

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Mark notification as read"""
    try:
        patient_id = str(current_user.id)
        user_notifications = notifications_store.get(patient_id, [])
        
        for notification in user_notifications:
            if notification["_id"] == notification_id:
                notification["read"] = True
                return {"message": "Notification marked as read"}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}"
        )

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read for current user"""
    try:
        patient_id = str(current_user.id)
        user_notifications = notifications_store.get(patient_id, [])
        
        for notification in user_notifications:
            notification["read"] = True
        
        return {"message": "All notifications marked as read"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark all notifications as read: {str(e)}"
        )

@router.delete("/clear-all")
async def clear_all_notifications(
    current_user: User = Depends(get_current_active_user)
):
    """Clear all notifications for current user (for testing)"""
    try:
        patient_id = str(current_user.id)
        notifications_store[patient_id] = []
        
        return {"message": "All notifications cleared"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear notifications: {str(e)}"
        )

@router.post("/test-notification")
async def create_test_notification(
    current_user: User = Depends(get_current_active_user)
):
    """Create a test notification with current timestamp (for testing)"""
    try:
        patient_id = str(current_user.id)
        current_utc = datetime.utcnow()
        
        # Create test notification
        notification = {
            "_id": str(ObjectId()),
            "patient_id": patient_id,
            "title": "Test Notification",
            "message": f"This is a test notification created at {current_utc.isoformat()}",
            "type": "test",
            "from_doctor": "System Test",
            "from_doctor_id": "system",
            "read": False,
            "created_at": current_utc
        }
        
        # Store notification
        if patient_id not in notifications_store:
            notifications_store[patient_id] = []
        
        notifications_store[patient_id].append(notification)
        
        print(f"🧪 TEST NOTIFICATION: Created for patient {patient_id}")
        print(f"⏰ Created at UTC: {current_utc}")
        print(f"⏰ ISO format: {current_utc.isoformat()}")
        
        return {
            "message": "Test notification created",
            "created_at": current_utc.isoformat(),
            "notification_id": notification["_id"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create test notification: {str(e)}"
        )
