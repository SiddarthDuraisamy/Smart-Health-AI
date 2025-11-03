"""
Blockchain simulation for secure health data audit trails
"""

import hashlib
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from bson import ObjectId
import logging

from database.connection import get_blockchain_ledger_collection

logger = logging.getLogger(__name__)

class HealthDataBlock:
    """Individual block in the health data blockchain"""
    
    def __init__(self, index: int, timestamp: datetime, data: Dict[str, Any], previous_hash: str):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = 0
        self.hash = self.calculate_hash()
    
    def calculate_hash(self) -> str:
        """Calculate SHA-256 hash of the block"""
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def mine_block(self, difficulty: int = 2):
        """Mine the block with proof of work (simplified)"""
        target = "0" * difficulty
        while self.hash[:difficulty] != target:
            self.nonce += 1
            self.hash = self.calculate_hash()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary for storage"""
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
            "hash": self.hash
        }

class HealthBlockchain:
    """Blockchain for health data audit trails"""
    
    def __init__(self):
        self.chain = []
        self.difficulty = 2
        self.pending_transactions = []
        self.mining_reward = 0  # No reward in health data context
    
    async def initialize_blockchain(self):
        """Initialize blockchain with genesis block"""
        ledger_collection = await get_blockchain_ledger_collection()
        
        # Check if blockchain already exists
        existing_blocks = await ledger_collection.count_documents({})
        if existing_blocks == 0:
            genesis_block = self.create_genesis_block()
            await ledger_collection.insert_one(genesis_block.to_dict())
            logger.info("Genesis block created for health blockchain")
    
    def create_genesis_block(self) -> HealthDataBlock:
        """Create the first block in the blockchain"""
        genesis_data = {
            "type": "genesis",
            "message": "Smart Health Consulting Services - Genesis Block",
            "created_by": "system"
        }
        return HealthDataBlock(0, datetime.utcnow(), genesis_data, "0")
    
    async def get_latest_block(self) -> Optional[HealthDataBlock]:
        """Get the latest block from the blockchain"""
        ledger_collection = await get_blockchain_ledger_collection()
        latest_block_data = await ledger_collection.find_one(
            {}, sort=[("index", -1)]
        )
        
        if latest_block_data:
            block = HealthDataBlock(
                latest_block_data["index"],
                latest_block_data["timestamp"],
                latest_block_data["data"],
                latest_block_data["previous_hash"]
            )
            block.nonce = latest_block_data["nonce"]
            block.hash = latest_block_data["hash"]
            return block
        
        return None
    
    async def add_transaction(self, transaction_data: Dict[str, Any]) -> str:
        """Add a new transaction to the blockchain"""
        try:
            # Get the latest block
            latest_block = await self.get_latest_block()
            
            if latest_block is None:
                await self.initialize_blockchain()
                latest_block = await self.get_latest_block()
            
            # Create new block
            new_index = latest_block.index + 1
            new_block = HealthDataBlock(
                new_index,
                datetime.utcnow(),
                transaction_data,
                latest_block.hash
            )
            
            # Mine the block
            new_block.mine_block(self.difficulty)
            
            # Store in database
            ledger_collection = await get_blockchain_ledger_collection()
            await ledger_collection.insert_one(new_block.to_dict())
            
            logger.info(f"New block added to blockchain: {new_block.hash}")
            return new_block.hash
            
        except Exception as e:
            logger.error(f"Error adding transaction to blockchain: {e}")
            raise e
    
    async def verify_chain_integrity(self) -> bool:
        """Verify the integrity of the entire blockchain"""
        try:
            ledger_collection = await get_blockchain_ledger_collection()
            blocks = await ledger_collection.find({}).sort("index", 1).to_list(length=None)
            
            for i in range(1, len(blocks)):
                current_block = blocks[i]
                previous_block = blocks[i - 1]
                
                # Verify current block hash
                temp_block = HealthDataBlock(
                    current_block["index"],
                    current_block["timestamp"],
                    current_block["data"],
                    current_block["previous_hash"]
                )
                temp_block.nonce = current_block["nonce"]
                
                if temp_block.calculate_hash() != current_block["hash"]:
                    logger.error(f"Invalid hash at block {current_block['index']}")
                    return False
                
                # Verify link to previous block
                if current_block["previous_hash"] != previous_block["hash"]:
                    logger.error(f"Invalid previous hash at block {current_block['index']}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying blockchain integrity: {e}")
            return False
    
    async def get_patient_audit_trail(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get audit trail for a specific patient"""
        ledger_collection = await get_blockchain_ledger_collection()
        
        patient_blocks = await ledger_collection.find({
            "data.patient_id": patient_id
        }).sort("timestamp", -1).to_list(length=None)
        
        return patient_blocks
    
    async def get_blockchain_stats(self) -> Dict[str, Any]:
        """Get blockchain statistics"""
        ledger_collection = await get_blockchain_ledger_collection()
        
        total_blocks = await ledger_collection.count_documents({})
        
        # Get transaction types distribution
        transaction_types = await ledger_collection.aggregate([
            {"$group": {"_id": "$data.action_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]).to_list(length=None)
        
        # Get recent activity (last 7 days)
        seven_days_ago = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        recent_activity = await ledger_collection.count_documents({
            "timestamp": {"$gte": seven_days_ago}
        })
        
        return {
            "total_blocks": total_blocks,
            "transaction_types": {item["_id"]: item["count"] for item in transaction_types},
            "recent_activity": recent_activity,
            "blockchain_integrity": await self.verify_chain_integrity()
        }

class HealthDataAuditor:
    """Audit health data access and modifications"""
    
    def __init__(self):
        self.blockchain = HealthBlockchain()
    
    async def log_data_access(
        self,
        patient_id: str,
        accessed_by: str,
        access_type: str,
        data_type: str,
        additional_info: Dict[str, Any] = None
    ) -> str:
        """Log data access event to blockchain"""
        transaction_data = {
            "action_type": "data_access",
            "patient_id": patient_id,
            "accessed_by": accessed_by,
            "access_type": access_type,  # read, write, delete
            "data_type": data_type,  # medical_record, consultation, vital_signs, etc.
            "timestamp": datetime.utcnow().isoformat(),
            "additional_info": additional_info or {}
        }
        
        return await self.blockchain.add_transaction(transaction_data)
    
    async def log_data_modification(
        self,
        patient_id: str,
        modified_by: str,
        modification_type: str,
        field_changed: str,
        old_value: Any = None,
        new_value: Any = None
    ) -> str:
        """Log data modification event to blockchain"""
        transaction_data = {
            "action_type": "data_modification",
            "patient_id": patient_id,
            "modified_by": modified_by,
            "modification_type": modification_type,  # create, update, delete
            "field_changed": field_changed,
            "old_value": str(old_value) if old_value is not None else None,
            "new_value": str(new_value) if new_value is not None else None,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.blockchain.add_transaction(transaction_data)
    
    async def log_consultation_event(
        self,
        consultation_id: str,
        patient_id: str,
        doctor_id: str,
        event_type: str,
        details: Dict[str, Any] = None
    ) -> str:
        """Log consultation-related event to blockchain"""
        transaction_data = {
            "action_type": "consultation_event",
            "consultation_id": consultation_id,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "event_type": event_type,  # created, started, completed, cancelled
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.blockchain.add_transaction(transaction_data)
    
    async def log_ai_interaction(
        self,
        patient_id: str,
        interaction_type: str,
        ai_model: str,
        input_data: str,
        output_data: str,
        confidence_score: float = None
    ) -> str:
        """Log AI interaction event to blockchain"""
        transaction_data = {
            "action_type": "ai_interaction",
            "patient_id": patient_id,
            "interaction_type": interaction_type,  # health_assessment, chat, diagnosis_assist
            "ai_model": ai_model,
            "input_data_hash": hashlib.sha256(input_data.encode()).hexdigest(),
            "output_data_hash": hashlib.sha256(output_data.encode()).hexdigest(),
            "confidence_score": confidence_score,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.blockchain.add_transaction(transaction_data)
    
    async def get_patient_consent_log(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get consent and access log for a patient"""
        audit_trail = await self.blockchain.get_patient_audit_trail(patient_id)
        
        # Filter and format for consent/access events
        consent_events = []
        for block in audit_trail:
            data = block.get("data", {})
            if data.get("action_type") in ["data_access", "data_modification", "consultation_event"]:
                consent_events.append({
                    "timestamp": block.get("timestamp"),
                    "action": data.get("action_type"),
                    "performed_by": data.get("accessed_by") or data.get("modified_by") or data.get("doctor_id"),
                    "details": data,
                    "block_hash": block.get("hash")
                })
        
        return consent_events

# Global instances
health_blockchain = HealthBlockchain()
health_auditor = HealthDataAuditor()
