"""
LLM Communication Engine for multilingual healthcare conversations
"""

import os
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import torch

logger = logging.getLogger(__name__)

class HealthcareLLM:
    """Healthcare-specialized LLM for patient communication and medical assistance"""
    
    def __init__(self):
        self.openai_model = None
        self.translation_model = None
        self.tokenizer = None
        self.supported_languages = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 
            'ar', 'hi', 'bn', 'ur', 'ta', 'te', 'ml', 'kn', 'gu', 'pa'
        ]
        self.initialize_models()
    
    def initialize_models(self):
        """Initialize LLM and translation models"""
        try:
            # Initialize OpenAI model if API key is available
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if openai_api_key:
                self.openai_model = ChatOpenAI(
                    model="gpt-3.5-turbo",
                    temperature=0.3,
                    openai_api_key=openai_api_key
                )
                logger.info("OpenAI model initialized successfully")
            
            # Initialize local translation model for multilingual support
            model_name = "Helsinki-NLP/opus-mt-mul-en"
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.translation_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                logger.info("Translation model initialized successfully")
            except Exception as e:
                logger.warning(f"Could not load translation model: {e}")
                
        except Exception as e:
            logger.error(f"Error initializing models: {e}")
    
    def get_healthcare_system_prompt(self) -> str:
        """Get the system prompt for healthcare conversations"""
        return """You are a helpful AI healthcare assistant. Your role is to:

1. Provide general health information and guidance
2. Help patients understand medical terms and conditions
3. Offer lifestyle and wellness recommendations
4. Assist with symptom assessment (but never diagnose)
5. Encourage patients to seek professional medical care when appropriate

IMPORTANT GUIDELINES:
- Never provide specific medical diagnoses
- Always recommend consulting healthcare professionals for serious concerns
- Be empathetic and supportive in your responses
- Use simple, clear language that patients can understand
- Respect patient privacy and confidentiality
- If asked about medications, always advise consulting a doctor or pharmacist

Remember: You are an assistant, not a replacement for professional medical care."""

    async def chat_with_patient(
        self, 
        message: str, 
        patient_context: Dict[str, Any] = None,
        conversation_history: List[Dict[str, str]] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate AI response for patient chat
        
        Args:
            message: Patient's message
            patient_context: Patient's medical context (age, conditions, etc.)
            conversation_history: Previous messages in the conversation
            language: Language code for the response
            
        Returns:
            Dict containing AI response and metadata
        """
        try:
            # Translate message to English if needed
            if language != "en":
                message = await self.translate_to_english(message, language)
            
            # Prepare context
            context_info = ""
            if patient_context:
                age = self._calculate_age(patient_context.get('date_of_birth'))
                gender = patient_context.get('gender', 'not specified')
                context_info = f"Patient context: Age {age}, Gender: {gender}"
                
                # Add relevant medical history
                medical_history = patient_context.get('medical_history', [])
                if medical_history:
                    conditions = [condition['condition'] for condition in medical_history[:3]]
                    context_info += f", Medical history: {', '.join(conditions)}"
            
            # Build conversation context
            conversation_context = ""
            if conversation_history:
                recent_messages = conversation_history[-6:]  # Last 6 messages for context
                for msg in recent_messages:
                    role = "Patient" if msg.get('sender') != 'ai' else "AI"
                    conversation_context += f"{role}: {msg.get('message', '')}\n"
            
            # Generate response
            if self.openai_model:
                response = await self._generate_openai_response(
                    message, context_info, conversation_context
                )
            else:
                response = self._generate_fallback_response(message, patient_context)
            
            # Translate response back to target language if needed
            if language != "en":
                response = await self.translate_from_english(response, language)
            
            return {
                "response": response,
                "language": language,
                "timestamp": datetime.utcnow(),
                "model_used": "gpt-3.5-turbo" if self.openai_model else "fallback",
                "confidence": 0.85 if self.openai_model else 0.6
            }
            
        except Exception as e:
            logger.error(f"Error in chat generation: {e}")
            return {
                "response": "I apologize, but I'm having trouble processing your message right now. Please try again or contact your healthcare provider if this is urgent.",
                "language": language,
                "timestamp": datetime.utcnow(),
                "model_used": "error_fallback",
                "confidence": 0.1
            }
    
    async def _generate_openai_response(
        self, 
        message: str, 
        context_info: str, 
        conversation_context: str
    ) -> str:
        """Generate response using OpenAI model"""
        system_prompt = self.get_healthcare_system_prompt()
        
        if context_info:
            system_prompt += f"\n\nPatient Information: {context_info}"
        
        if conversation_context:
            system_prompt += f"\n\nRecent Conversation:\n{conversation_context}"
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=message)
        ]
        
        response = await self.openai_model.agenerate([messages])
        return response.generations[0][0].text.strip()
    
    def _generate_fallback_response(self, message: str, patient_context: Dict[str, Any] = None) -> str:
        """Generate fallback response when OpenAI is not available"""
        message_lower = message.lower()
        
        # Symptom-related responses
        if any(word in message_lower for word in ['pain', 'hurt', 'ache', 'sore']):
            return "I understand you're experiencing pain. While I can't diagnose the cause, I recommend documenting when the pain occurs, its intensity (1-10 scale), and any triggers. If the pain is severe or persistent, please consult your healthcare provider promptly."
        
        if any(word in message_lower for word in ['fever', 'temperature', 'hot', 'chills']):
            return "Fever can be a sign that your body is fighting an infection. Monitor your temperature regularly, stay hydrated, and rest. If your fever is above 101°F (38.3°C) or persists for more than 3 days, please contact your healthcare provider."
        
        if any(word in message_lower for word in ['headache', 'migraine']):
            return "Headaches can have various causes including stress, dehydration, or lack of sleep. Try resting in a quiet, dark room and staying hydrated. If headaches are severe, frequent, or accompanied by other symptoms, please consult your doctor."
        
        if any(word in message_lower for word in ['cough', 'cold', 'congestion']):
            return "For cold symptoms, rest and hydration are important. Warm liquids and humidified air may help with congestion. If symptoms worsen or persist beyond 10 days, or if you develop a high fever, please see your healthcare provider."
        
        # Medication-related responses
        if any(word in message_lower for word in ['medication', 'medicine', 'drug', 'pill']):
            return "For any questions about medications, including dosages, side effects, or interactions, please consult your doctor or pharmacist. They have access to your complete medical history and can provide personalized advice."
        
        # General wellness responses
        if any(word in message_lower for word in ['diet', 'nutrition', 'food', 'eat']):
            return "A balanced diet with plenty of fruits, vegetables, whole grains, and lean proteins supports good health. Stay hydrated and limit processed foods. For personalized nutrition advice, consider consulting a registered dietitian."
        
        if any(word in message_lower for word in ['exercise', 'workout', 'fitness']):
            return "Regular physical activity is great for your health! Aim for at least 150 minutes of moderate exercise per week. Start slowly and gradually increase intensity. Always consult your doctor before starting a new exercise program, especially if you have health conditions."
        
        if any(word in message_lower for word in ['sleep', 'tired', 'fatigue']):
            return "Good sleep is essential for health. Aim for 7-9 hours per night. Maintain a regular sleep schedule, create a comfortable sleep environment, and avoid screens before bedtime. If sleep problems persist, discuss with your healthcare provider."
        
        # Default response
        return "Thank you for your message. While I can provide general health information, I recommend discussing your specific concerns with your healthcare provider who can give you personalized medical advice based on your individual situation."
    
    async def translate_to_english(self, text: str, source_language: str) -> str:
        """Translate text from source language to English"""
        if not self.translation_model or source_language == "en":
            return text
        
        try:
            # This is a simplified translation - in production, you'd use a proper translation service
            return text  # Placeholder - implement actual translation
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text
    
    async def translate_from_english(self, text: str, target_language: str) -> str:
        """Translate text from English to target language"""
        if not self.translation_model or target_language == "en":
            return text
        
        try:
            # This is a simplified translation - in production, you'd use a proper translation service
            return text  # Placeholder - implement actual translation
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text
    
    def _calculate_age(self, date_of_birth) -> int:
        """Calculate age from date of birth"""
        if not date_of_birth:
            return 0
        
        if isinstance(date_of_birth, str):
            try:
                dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))
            except:
                return 0
        else:
            dob = date_of_birth
            
        return (datetime.now() - dob).days // 365
    
    async def generate_consultation_summary(
        self, 
        consultation_data: Dict[str, Any]
    ) -> str:
        """Generate AI summary of a consultation"""
        try:
            # Extract key information
            chief_complaint = consultation_data.get('chief_complaint', '')
            symptoms = consultation_data.get('symptoms', [])
            diagnoses = consultation_data.get('diagnoses', [])
            treatments = consultation_data.get('treatments', [])
            chat_messages = consultation_data.get('chat_messages', [])
            
            # Build summary prompt
            summary_prompt = f"""
            Please provide a concise medical consultation summary based on the following information:
            
            Chief Complaint: {chief_complaint}
            
            Symptoms: {', '.join([s.get('name', '') for s in symptoms])}
            
            Diagnoses: {', '.join([d.get('condition', '') for d in diagnoses])}
            
            Treatments: {', '.join([t.get('description', '') for t in treatments])}
            
            Key Discussion Points: {self._extract_key_points(chat_messages)}
            
            Please format as a professional medical summary suitable for medical records.
            """
            
            if self.openai_model:
                messages = [
                    SystemMessage(content="You are a medical documentation assistant. Create clear, professional consultation summaries."),
                    HumanMessage(content=summary_prompt)
                ]
                response = await self.openai_model.agenerate([messages])
                return response.generations[0][0].text.strip()
            else:
                return self._generate_fallback_summary(consultation_data)
                
        except Exception as e:
            logger.error(f"Error generating consultation summary: {e}")
            return "Summary generation failed. Please review consultation details manually."
    
    def _extract_key_points(self, chat_messages: List[Dict[str, Any]]) -> str:
        """Extract key discussion points from chat messages"""
        key_points = []
        for msg in chat_messages[-10:]:  # Last 10 messages
            message_text = msg.get('message', '')
            if len(message_text) > 20:  # Filter out very short messages
                key_points.append(message_text[:100])  # Truncate long messages
        
        return '; '.join(key_points)
    
    def _generate_fallback_summary(self, consultation_data: Dict[str, Any]) -> str:
        """Generate basic summary when AI is not available"""
        chief_complaint = consultation_data.get('chief_complaint', 'Not specified')
        symptoms = consultation_data.get('symptoms', [])
        diagnoses = consultation_data.get('diagnoses', [])
        treatments = consultation_data.get('treatments', [])
        
        summary = f"Consultation Summary:\n\n"
        summary += f"Chief Complaint: {chief_complaint}\n\n"
        
        if symptoms:
            summary += "Reported Symptoms:\n"
            for symptom in symptoms:
                summary += f"- {symptom.get('name', '')}: {symptom.get('description', '')}\n"
            summary += "\n"
        
        if diagnoses:
            summary += "Diagnoses:\n"
            for diagnosis in diagnoses:
                summary += f"- {diagnosis.get('condition', '')}\n"
            summary += "\n"
        
        if treatments:
            summary += "Treatment Plan:\n"
            for treatment in treatments:
                summary += f"- {treatment.get('description', '')}\n"
        
        return summary

# Global instance
healthcare_llm = HealthcareLLM()
