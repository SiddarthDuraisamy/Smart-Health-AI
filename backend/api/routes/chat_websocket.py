"""
Real-time chat WebSocket endpoint for AI Health Assistant
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, List, Any, Optional
import json
import asyncio
from datetime import datetime
from bson import ObjectId

from models.user import User, UserRole
from models.consultation import ChatMessage
from auth.security import get_current_user_from_token
from database.connection import get_consultations_collection, get_patients_collection
from ml.llm_engine import healthcare_llm
from blockchain.ledger import health_auditor

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, str] = {}  # user_id -> connection_id
        self.conversation_memory: Dict[str, List[Dict[str, Any]]] = {}  # user_id -> conversation history

    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        self.user_connections[user_id] = connection_id
        print(f"✅ User {user_id} connected with connection {connection_id}")

    def disconnect(self, connection_id: str, user_id: str = None):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        print(f"🔌 Connection {connection_id} disconnected for user {user_id}")
        print(f"📊 Active connections: {len(self.active_connections)}, Users: {len(self.user_connections)}")

    async def send_personal_message(self, message: dict, user_id: str):
        connection_id = self.user_connections.get(user_id)
        if connection_id and connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(message))
                return True
            except Exception as e:
                print(f"Error sending message to {user_id}: {e}")
                self.disconnect(connection_id, user_id)
                return False
        return False

    async def broadcast_to_consultation(self, message: dict, consultation_id: str, exclude_user: str = None):
        # In a full implementation, you'd track which users are in which consultations
        # For now, we'll just send to all connected users except the sender
        for user_id, connection_id in self.user_connections.items():
            if user_id != exclude_user:
                await self.send_personal_message(message, user_id)

    def add_to_conversation_memory(self, user_id: str, message: Dict[str, Any]):
        """Add a message to user's conversation memory"""
        if user_id not in self.conversation_memory:
            self.conversation_memory[user_id] = []
        
        # Keep only last 50 messages to prevent memory bloat
        if len(self.conversation_memory[user_id]) >= 50:
            self.conversation_memory[user_id] = self.conversation_memory[user_id][-40:]  # Keep last 40
        
        self.conversation_memory[user_id].append(message)
        print(f"💾 Added message to conversation memory for user {user_id}. Total messages: {len(self.conversation_memory[user_id])}")

    def get_conversation_memory(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's conversation history"""
        history = self.conversation_memory.get(user_id, [])
        print(f"🧠 Retrieved {len(history)} messages from conversation memory for user {user_id}")
        return history

    def clear_conversation_memory(self, user_id: str):
        """Clear user's conversation memory"""
        if user_id in self.conversation_memory:
            del self.conversation_memory[user_id]
            print(f"🗑️ Cleared conversation memory for user {user_id}")

manager = ConnectionManager()

@router.websocket("/chat/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time chat with AI Health Assistant
    """
    connection_id = f"conn_{user_id}_{datetime.now().timestamp()}"
    
    try:
        # Get token from query parameters
        query_params = websocket.query_params
        token = query_params.get("token")
        
        print(f"🔐 WebSocket auth attempt for user {user_id} with token: {token[:20] if token else 'None'}...")
        
        # Authenticate user
        if not token:
            print(f"❌ No token provided for user {user_id}")
            await websocket.close(code=4001, reason="Authentication token required")
            return
            
        try:
            current_user = await get_current_user_from_token(token)
            print(f"✅ Token validated for user: {current_user.email} (ID: {current_user.id})")
            
            # Allow both actual user ID and email-based ID for compatibility
            email_based_id = current_user.email.replace('@', '_').replace('.', '_')
            
            if str(current_user.id) != user_id and email_based_id != user_id:
                print(f"❌ User ID mismatch: token user {current_user.id} (email: {email_based_id}) != requested user {user_id}")
                await websocket.close(code=4003, reason="User ID mismatch")
                return
                
            print(f"✅ User ID validated: {user_id} (matches {current_user.email})")
        except Exception as e:
            print(f"❌ Token validation failed: {str(e)}")
            await websocket.close(code=4001, reason="Invalid authentication token")
            return

        # Connect user
        await manager.connect(websocket, user_id, connection_id)
        
        # Send welcome message
        welcome_message = {
            "type": "system",
            "message": "Connected to AI Health Assistant",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id
        }
        await websocket.send_text(json.dumps(welcome_message))

        # Listen for messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                await handle_chat_message(message_data, current_user, websocket)
                
            except WebSocketDisconnect as e:
                print(f"🔌 WebSocket disconnect for user {user_id}: code={e.code}, reason={e.reason}")
                break
            except json.JSONDecodeError:
                error_msg = {
                    "type": "error",
                    "message": "Invalid JSON format",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket.send_text(json.dumps(error_msg))
            except Exception as e:
                error_msg = {
                    "type": "error", 
                    "message": f"Error processing message: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket.send_text(json.dumps(error_msg))

    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        manager.disconnect(connection_id, user_id)

async def handle_chat_message(message_data: dict, current_user: User, websocket: WebSocket):
    """Handle incoming chat message and generate AI response"""
    
    message_type = message_data.get("type", "chat")
    user_message = message_data.get("message", "")
    consultation_id = message_data.get("consultation_id")
    language = message_data.get("language", "en")
    
    # Handle special commands
    if user_message.lower().strip() in ['/clear', '/reset', '/new']:
        # Clear conversation memory
        manager.clear_conversation_memory(str(current_user.id))
        clear_msg = {
            "type": "system",
            "message": "🔄 Conversation memory cleared. Starting fresh!",
            "timestamp": datetime.utcnow().isoformat(),
            "sender": "system"
        }
        await websocket.send_text(json.dumps(clear_msg))
        return
    
    if message_type == "chat" and user_message:
        # Echo user message back with confirmation
        user_msg_response = {
            "type": "user_message",
            "message": user_message,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": str(current_user.id),
            "user_name": current_user.full_name,
            "status": "sent"
        }
        await websocket.send_text(json.dumps(user_msg_response))
        
        # Show typing indicator
        typing_msg = {
            "type": "typing",
            "message": "AI Assistant is typing...",
            "timestamp": datetime.utcnow().isoformat(),
            "sender": "ai"
        }
        await websocket.send_text(json.dumps(typing_msg))
        
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
        
        # Get conversation history - prioritize consultation history, fallback to memory
        conversation_history = []
        if consultation_id:
            # Get from consultation database
            consultations_collection = await get_consultations_collection()
            try:
                consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
                if consultation:
                    conversation_history = consultation.get("chat_messages", [])
                    print(f"📋 Using consultation history: {len(conversation_history)} messages")
            except Exception:
                pass
        
        # If no consultation history, use in-memory conversation history
        if not conversation_history:
            conversation_history = manager.get_conversation_memory(str(current_user.id))
            print(f"🧠 Using memory history: {len(conversation_history)} messages")
        
        try:
            # Add user message to conversation memory
            user_msg_memory = {
                "sender": str(current_user.id),
                "message": user_message,
                "timestamp": datetime.utcnow().isoformat(),
                "language": language,
                "type": "user_message"
            }
            manager.add_to_conversation_memory(str(current_user.id), user_msg_memory)
            
            # Generate streaming AI response
            ai_response_text = await healthcare_llm.chat_with_patient_stream(
                message=user_message,
                patient_context=patient_context,
                conversation_history=conversation_history,
                language=language,
                websocket=websocket
            )
            
            # Add AI response to conversation memory
            ai_msg_memory = {
                "sender": "ai",
                "message": ai_response_text,
                "timestamp": datetime.utcnow().isoformat(),
                "language": language,
                "type": "ai_message"
            }
            manager.add_to_conversation_memory(str(current_user.id), ai_msg_memory)
            
            # Log AI interaction to blockchain
            try:
                await health_auditor.log_ai_interaction(
                    patient_id=str(current_user.id),
                    interaction_type="health_chat",
                    ai_model="gemini-2.5-flash",
                    input_data=user_message,
                    output_data=ai_response_text,
                    confidence_score=0.9  # Default confidence score
                )
            except Exception as e:
                print(f"⚠️ Blockchain AI logging failed: {e}")
            
            # Note: The streaming method sends messages directly to websocket
            # No need to send additional response here as it's handled in the streaming method
            
            # Save to database if consultation_id provided
            if consultation_id:
                await save_chat_messages(consultation_id, current_user, user_message, ai_response_text, language)
                
        except Exception as e:
            error_response = {
                "type": "ai_message",
                "message": "I'm experiencing some technical difficulties. Please try again in a moment.",
                "timestamp": datetime.utcnow().isoformat(),
                "sender": "ai",
                "error": True
            }
            await websocket.send_text(json.dumps(error_response))
    
    elif message_type == "typing":
        # Handle typing indicators (could broadcast to other participants)
        typing_msg = {
            "type": "user_typing",
            "user_id": str(current_user.id),
            "user_name": current_user.full_name,
            "timestamp": datetime.utcnow().isoformat(),
            "is_typing": message_data.get("is_typing", False)
        }
        # In a group chat, you'd broadcast this to other participants
        # For now, we'll just acknowledge it
        pass

async def save_chat_messages(consultation_id: str, user: User, user_message: str, ai_response: str, language: str = "en"):
    """Save chat messages to consultation in database"""
    try:
        consultations_collection = await get_consultations_collection()
        
        # Create message objects
        user_msg = ChatMessage(
            sender=str(user.id),
            message=user_message,
            language=language
        )
        
        ai_msg = ChatMessage(
            sender="ai",
            message=ai_response,
            language=language
        )
        
        # Save to database
        await consultations_collection.update_one(
            {"_id": ObjectId(consultation_id)},
            {
                "$push": {
                    "chat_messages": {
                        "$each": [user_msg.dict(), ai_msg.dict()]
                    }
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
    except Exception as e:
        print(f"Error saving chat messages: {e}")

@router.get("/chat-history/{consultation_id}")
async def get_chat_history(
    consultation_id: str,
    current_user: User = Depends(get_current_user_from_token)
):
    """Get chat history for a consultation"""
    try:
        consultations_collection = await get_consultations_collection()
        consultation = await consultations_collection.find_one({"_id": ObjectId(consultation_id)})
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Check if user has access to this consultation
        if (current_user.role == UserRole.PATIENT and 
            str(consultation.get("patient_id")) != str(current_user.id)):
            raise HTTPException(status_code=403, detail="Access denied")
        
        chat_messages = consultation.get("chat_messages", [])
        
        return {
            "consultation_id": consultation_id,
            "messages": chat_messages,
            "total_messages": len(chat_messages)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chat history: {str(e)}")

@router.get("/memory-status")
async def get_memory_status(
    current_user: User = Depends(get_current_user_from_token)
):
    """Get conversation memory status for current user"""
    try:
        user_id = str(current_user.id)
        memory = manager.get_conversation_memory(user_id)
        
        return {
            "user_id": user_id,
            "total_messages": len(memory),
            "memory_preview": memory[-5:] if memory else [],  # Last 5 messages
            "has_memory": len(memory) > 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving memory status: {str(e)}")

@router.post("/clear-memory")
async def clear_memory(
    current_user: User = Depends(get_current_user_from_token)
):
    """Clear conversation memory for current user"""
    try:
        user_id = str(current_user.id)
        manager.clear_conversation_memory(user_id)
        
        return {
            "message": "Conversation memory cleared successfully",
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing memory: {str(e)}")
