"""
Blockchain audit trail API routes
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from models.user import User, UserRole
from auth.security import get_current_active_user, require_roles
from blockchain.ledger import health_blockchain, health_auditor

router = APIRouter()

@router.get("/stats", response_model=Dict[str, Any])
async def get_blockchain_stats(
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN]))
):
    """Get blockchain statistics and integrity status"""
    try:
        stats = await health_blockchain.get_blockchain_stats()
        return {
            "blockchain_stats": stats,
            "message": "Blockchain statistics retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving blockchain stats: {str(e)}"
        )

@router.get("/audit-trail/{patient_id}")
async def get_patient_audit_trail(
    patient_id: str,
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(50, description="Maximum number of audit records to return"),
    skip: int = Query(0, description="Number of records to skip")
):
    """Get complete audit trail for a specific patient"""
    try:
        # Check permissions - patients can only view their own audit trail
        if current_user.role == UserRole.PATIENT:
            if str(current_user.id) != patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients can only view their own audit trail"
                )
        elif current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        audit_trail = await health_blockchain.get_patient_audit_trail(patient_id)
        
        # Apply pagination
        paginated_trail = audit_trail[skip:skip + limit]
        
        return {
            "patient_id": patient_id,
            "audit_trail": paginated_trail,
            "total_records": len(audit_trail),
            "returned_records": len(paginated_trail),
            "skip": skip,
            "limit": limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving audit trail: {str(e)}"
        )

@router.get("/consent-log/{patient_id}")
async def get_patient_consent_log(
    patient_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get consent and data access log for a specific patient"""
    try:
        # Check permissions
        if current_user.role == UserRole.PATIENT:
            if str(current_user.id) != patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients can only view their own consent log"
                )
        elif current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        consent_log = await health_auditor.get_patient_consent_log(patient_id)
        
        return {
            "patient_id": patient_id,
            "consent_events": consent_log,
            "total_events": len(consent_log)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving consent log: {str(e)}"
        )

@router.get("/verify-integrity")
async def verify_blockchain_integrity(
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """Verify the integrity of the entire blockchain (Admin only)"""
    try:
        is_valid = await health_blockchain.verify_chain_integrity()
        
        return {
            "blockchain_valid": is_valid,
            "verification_timestamp": datetime.utcnow().isoformat(),
            "message": "Blockchain integrity verified" if is_valid else "Blockchain integrity compromised!"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying blockchain integrity: {str(e)}"
        )

@router.get("/recent-activity")
async def get_recent_blockchain_activity(
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    hours: int = Query(24, description="Number of hours to look back for recent activity"),
    limit: int = Query(100, description="Maximum number of records to return")
):
    """Get recent blockchain activity across all patients"""
    try:
        from database.connection import get_blockchain_ledger_collection
        
        # Calculate time threshold
        time_threshold = datetime.utcnow() - timedelta(hours=hours)
        
        ledger_collection = await get_blockchain_ledger_collection()
        recent_blocks = await ledger_collection.find({
            "timestamp": {"$gte": time_threshold}
        }).sort("timestamp", -1).limit(limit).to_list(length=limit)
        
        # Format the response
        activity_summary = {
            "data_access": 0,
            "data_modification": 0,
            "consultation_event": 0,
            "ai_interaction": 0,
            "other": 0
        }
        
        for block in recent_blocks:
            action_type = block.get("data", {}).get("action_type", "other")
            if action_type in activity_summary:
                activity_summary[action_type] += 1
            else:
                activity_summary["other"] += 1
        
        return {
            "time_range_hours": hours,
            "total_activities": len(recent_blocks),
            "activity_breakdown": activity_summary,
            "recent_blocks": recent_blocks[:20],  # Return only first 20 for display
            "query_timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving recent activity: {str(e)}"
        )

@router.get("/data-access-report/{patient_id}")
async def get_data_access_report(
    patient_id: str,
    current_user: User = Depends(get_current_active_user),
    days: int = Query(30, description="Number of days to include in the report")
):
    """Generate a data access report for a specific patient"""
    try:
        # Check permissions
        if current_user.role == UserRole.PATIENT:
            if str(current_user.id) != patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients can only view their own data access report"
                )
        elif current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        from database.connection import get_blockchain_ledger_collection
        
        # Calculate time threshold
        time_threshold = datetime.utcnow() - timedelta(days=days)
        
        ledger_collection = await get_blockchain_ledger_collection()
        access_records = await ledger_collection.find({
            "data.patient_id": patient_id,
            "data.action_type": "data_access",
            "timestamp": {"$gte": time_threshold}
        }).sort("timestamp", -1).to_list(length=None)
        
        # Analyze access patterns
        access_by_user = {}
        access_by_data_type = {}
        daily_access_count = {}
        
        for record in access_records:
            data = record.get("data", {})
            accessed_by = data.get("accessed_by", "unknown")
            data_type = data.get("data_type", "unknown")
            timestamp = record.get("timestamp")
            
            # Count by user
            access_by_user[accessed_by] = access_by_user.get(accessed_by, 0) + 1
            
            # Count by data type
            access_by_data_type[data_type] = access_by_data_type.get(data_type, 0) + 1
            
            # Count by day
            if timestamp:
                day_key = timestamp.strftime("%Y-%m-%d")
                daily_access_count[day_key] = daily_access_count.get(day_key, 0) + 1
        
        return {
            "patient_id": patient_id,
            "report_period_days": days,
            "total_access_events": len(access_records),
            "access_by_user": access_by_user,
            "access_by_data_type": access_by_data_type,
            "daily_access_pattern": daily_access_count,
            "recent_access_events": access_records[:10],  # Last 10 events
            "report_generated": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating data access report: {str(e)}"
        )
