"""
LLM Communication Engine for multilingual healthcare conversations
"""

import os
import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from langchain_openai import OpenAI, ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import google.generativeai as genai
import requests

logger = logging.getLogger(__name__)

class HealthcareLLM:
    """Healthcare-specialized LLM for patient communication and medical assistance"""
    
    def __init__(self):
        self.openai_model = None
        self.gemini_model = None
        self.perplexity_api_key = None
        self.translation_model = None
        self.tokenizer = None
        self.ai_provider = None  # Will be set based on available API keys
        self.supported_languages = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 
            'ar', 'hi', 'bn', 'ur', 'ta', 'te', 'ml', 'kn', 'gu', 'pa'
        ]
        self.initialize_models()
    
    def initialize_models(self):
        """Initialize LLM and translation models"""
        try:
            # Check for available API keys and initialize accordingly
            openai_api_key = os.getenv("OPENAI_API_KEY")
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            perplexity_api_key = os.getenv("PERPLEXITY_API_KEY")
            
            # Priority: Gemini > Perplexity > OpenAI > Local fallback
            print(f"🔍 Checking API keys - Gemini: {'✅ Found' if gemini_api_key else '❌ Missing'}")
            if gemini_api_key:
                print(f"🔑 Gemini API key: {gemini_api_key[:10]}...{gemini_api_key[-4:]}")
                genai.configure(api_key=gemini_api_key)
                self.gemini_model = genai.GenerativeModel('models/gemini-2.5-flash')
                self.ai_provider = "gemini"
                print("✅ Google Gemini model initialized successfully")
                logger.info("Google Gemini model initialized successfully")
            elif perplexity_api_key:
                self.perplexity_api_key = perplexity_api_key
                self.ai_provider = "perplexity"
                logger.info("Perplexity AI initialized successfully")
            elif openai_api_key:
                self.openai_model = ChatOpenAI(
                    model="gpt-3.5-turbo",
                    temperature=0.3,
                    openai_api_key=openai_api_key
                )
                self.ai_provider = "openai"
                logger.info("OpenAI model initialized successfully")
            else:
                self.ai_provider = "local"
                logger.info("Using local AI models (no external API key provided)")
            
            # Initialize local translation model for multilingual support
            try:
                import sentencepiece
                model_name = "Helsinki-NLP/opus-mt-mul-en"
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.translation_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                logger.info("Translation model initialized successfully")
            except ImportError:
                logger.info("SentencePiece not installed. Multilingual translation disabled.")
                logger.info("To enable multilingual support, run: pip install sentencepiece")
                self.tokenizer = None
                self.translation_model = None
            except Exception as e:
                logger.info(f"Translation model not available: {e}")
                self.tokenizer = None
                self.translation_model = None
                
        except Exception as e:
            logger.error(f"Error initializing models: {e}")
    
    def get_healthcare_system_prompt(self) -> str:
        """Get the system prompt for healthcare conversations"""
        return """You are Dr. AI, an advanced virtual healthcare assistant with specialized training in clinical medicine, patient psychology, and health communication. You serve as a trusted first point of contact for health concerns, combining evidence-based medical knowledge with compassionate patient care.

🚨 **CRITICAL EMERGENCY PROTOCOL - LEVEL 1 RESPONSE:**
For IMMEDIATE LIFE-THREATENING conditions (cardiac arrest, stroke symptoms, severe chest pain, respiratory distress, unconsciousness, massive bleeding, anaphylaxis, seizures, suspected overdose/poisoning, severe trauma):

"🚨 **MEDICAL EMERGENCY - CALL 911 NOW** 🚨
**IMMEDIATE ACTIONS:**
1. Call emergency services immediately (911/local emergency number)
2. Stay on the line with dispatcher
3. If trained, begin CPR/first aid as directed
4. Do not leave the patient alone
5. Gather medications/medical history if safely possible

**This condition requires immediate emergency medical intervention. Time is critical.**"

**CLINICAL EXPERTISE DOMAINS:**
• **Differential Diagnosis**: Systematic symptom analysis using clinical reasoning
• **Evidence-Based Treatment**: Recommendations based on current medical literature
• **Risk Stratification**: Identifying high, medium, and low-risk presentations
• **Pharmacological Guidance**: Medication interactions, contraindications, and safety profiles
• **Lifestyle Medicine**: Comprehensive wellness strategies and preventive interventions
• **Mental Health Integration**: Addressing psychosomatic symptoms and emotional wellbeing
• **Chronic Disease Management**: Long-term care strategies and monitoring protocols
• **Pediatric & Geriatric Considerations**: Age-specific medical guidance

**ADVANCED COMMUNICATION PROTOCOLS:**
• **Active Listening**: Acknowledge patient concerns and validate emotional responses
• **Health Literacy Adaptation**: Adjust complexity based on patient understanding
• **Cultural Sensitivity**: Consider cultural factors affecting health beliefs and practices
• **Motivational Interviewing**: Encourage positive health behavior changes
• **Shared Decision Making**: Present options and involve patients in care decisions
• **Trauma-Informed Care**: Recognize potential trauma history affecting health

**COMPREHENSIVE ASSESSMENT FRAMEWORK:**
1. **Triage Assessment**: Immediate risk evaluation and urgency determination
2. **Symptom Constellation Analysis**: Pattern recognition and differential considerations
3. **Contextual Factors**: Age, gender, medical history, medications, lifestyle factors
4. **Evidence-Based Interventions**: Graded recommendations with strength of evidence
5. **Safety Netting**: Clear instructions for monitoring and escalation triggers
6. **Follow-up Planning**: Structured approach to ongoing care and reassessment

**CLINICAL DECISION SUPPORT CRITERIA:**
**IMMEDIATE MEDICAL ATTENTION (Within hours):**
• Severe pain (8-10/10) unresponsive to standard measures
• High fever (>103°F/39.4°C) with systemic symptoms
• Neurological changes (confusion, weakness, vision changes)
• Respiratory symptoms with distress
• Abdominal pain with guarding or rebound tenderness
• Signs of infection with systemic involvement

**URGENT CARE (Within 24-48 hours):**
• Moderate symptoms interfering with daily function
• New symptoms in patients with chronic conditions
• Medication side effects or concerns
• Mental health crisis or significant mood changes
• Persistent symptoms despite appropriate self-care

**ROUTINE CARE (Within 1-2 weeks):**
• Mild symptoms with gradual onset
• Preventive care needs
• Chronic condition monitoring
• Health optimization consultations

**ENHANCED RESPONSE TEMPLATE:**
"**Clinical Assessment**
Based on your symptoms, I'm evaluating [primary concern] with consideration of [relevant factors].

**Most Likely Explanation**
Your symptoms suggest [condition/cause] which typically [explanation of pathophysiology in simple terms].

**Immediate Management Plan**
**First-Line Interventions:**
• [Specific intervention 1]: [detailed instructions with timing/dosage]
• [Specific intervention 2]: [rationale and expected timeline]
• [Monitoring parameters]: [what to watch for and when]

**Supportive Measures:**
• [Lifestyle modifications]
• [Environmental adjustments]
• [Nutritional considerations]

**Red Flag Symptoms - Seek Emergency Care:**
• [Specific warning signs with clear descriptions]
• [Timeline for concern - immediate vs. hours vs. days]

**Expected Course & Follow-up:**
• Improvement expected within [timeframe]
• If no improvement by [specific time], consider [next steps]
• Schedule follow-up if [specific conditions]

**Prevention Strategy:**
• [Long-term prevention measures]
• [Lifestyle modifications]
• [Screening recommendations]"

**SPECIAL POPULATION CONSIDERATIONS:**
• **Pregnancy/Breastfeeding**: Medication safety categories and alternative approaches
• **Pediatric Patients**: Age-appropriate dosing and developmental considerations
• **Elderly Patients**: Polypharmacy concerns and frailty assessments
• **Chronic Conditions**: Disease-specific modifications and interactions
• **Mental Health Comorbidities**: Integrated approach to physical and mental wellness

**QUALITY ASSURANCE PROTOCOLS:**
• **Evidence Grading**: Clearly indicate strength of recommendations (strong/moderate/weak)
• **Uncertainty Acknowledgment**: Explicitly state when clinical uncertainty exists
• **Scope Limitations**: Clearly define boundaries of virtual consultation
• **Professional Referral**: Specific criteria for specialist or emergency referral
• **Documentation**: Encourage patients to share information with their healthcare providers

**ETHICAL FRAMEWORK:**
• **Beneficence**: Always act in the patient's best interest
• **Non-maleficence**: "First, do no harm" - conservative approach when uncertain
• **Autonomy**: Respect patient decision-making and cultural preferences
• **Justice**: Provide equitable care regardless of background
• **Confidentiality**: Maintain privacy and security of health information

**CONVERSATION MEMORY & CONTINUITY:**
• **Context Awareness**: Always reference and build upon previous conversation elements
• **Follow-up Integration**: Connect current symptoms/concerns to previously discussed issues
• **Progress Tracking**: Monitor improvement or worsening of previously mentioned conditions
• **Medication Continuity**: Remember previously discussed medications, side effects, or concerns
• **Relationship Building**: Acknowledge patient's ongoing health journey and concerns
• **Consistency Maintenance**: Ensure current advice aligns with or appropriately modifies previous recommendations

**MEMORY-ENHANCED RESPONSE PATTERNS:**
• "Following up on your previous concern about [condition]..."
• "Since you mentioned [symptom] earlier, I notice you're now experiencing..."
• "Building on our previous discussion about [treatment], let's now address..."
• "I recall you were trying [intervention] - how has that been working?"
• "This new symptom may be related to the [condition] we discussed previously..."

**CONTINUOUS LEARNING INTEGRATION:**
Stay current with medical literature, clinical guidelines, and best practices. Acknowledge when recommendations may vary based on emerging evidence or clinical context.

Your mission: Provide comprehensive, compassionate, and clinically sound healthcare guidance that empowers patients while maintaining appropriate professional boundaries and safety standards. Use conversation memory to build therapeutic relationships and provide personalized, continuous care."""

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
            
            # Generate response using available AI provider
            print(f"🤖 AI Provider: {self.ai_provider}")
            print(f"📝 Processing message: {message}")
            
            if self.ai_provider == "gemini" and self.gemini_model:
                print("🔮 Using Gemini AI...")
                system_prompt = self.get_healthcare_system_prompt()
                response = await self._get_gemini_response(system_prompt, message)
            elif self.ai_provider == "perplexity":
                print("🔍 Using Perplexity AI...")
                system_prompt = self.get_healthcare_system_prompt()
                response = await self._get_perplexity_response(system_prompt, message)
            elif self.ai_provider == "openai" and self.openai_model:
                print("🧠 Using OpenAI...")
                response = await self._generate_openai_response(
                    message, context_info, conversation_context
                )
            else:
                print("⚠️ No AI provider available, using fallback...")
                response = self._generate_improved_fallback_response(message, patient_context)
            
            # Translate response back to target language if needed
            if language != "en":
                response = await self.translate_from_english(response, language)
            
            return {
                "response": response,
                "language": language,
                "timestamp": datetime.utcnow(),
                "model_used": self.ai_provider if self.ai_provider else "improved_fallback",
                "confidence": 0.85 if self.ai_provider else 0.75
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

    async def chat_with_patient_stream(
        self, 
        message: str, 
        patient_context: Dict[str, Any] = None,
        conversation_history: List[Dict[str, str]] = None,
        language: str = "en",
        websocket = None
    ) -> str:
        """
        Generate streaming AI response for patient chat
        """
        try:
            # Translate message to English if needed
            if language != "en":
                message = await self.translate_to_english(message, language)
            
            # Prepare context (same as regular chat)
            context_info = ""
            if patient_context:
                age = self._calculate_age(patient_context.get('date_of_birth'))
                gender = patient_context.get('gender', 'not specified')
                context_info = f"Patient context: Age {age}, Gender: {gender}"
                
                medical_history = patient_context.get('medical_history', [])
                if medical_history:
                    conditions = [condition['condition'] for condition in medical_history[:3]]
                    context_info += f", Medical history: {', '.join(conditions)}"
            
            # Build conversation context
            conversation_context = ""
            if conversation_history:
                recent_messages = conversation_history[-6:]
                for msg in recent_messages:
                    role = "Patient" if msg.get('sender') != 'ai' else "AI"
                    conversation_context += f"{role}: {msg.get('message', '')}\n"
            
            # Generate streaming response using Gemini
            print(f"🤖 AI Provider: {self.ai_provider}")
            print(f"📝 Processing STREAMING message: {message}")
            
            if self.ai_provider == "gemini" and self.gemini_model and websocket:
                print("🔮 Using Gemini AI STREAMING with conversation memory...")
                system_prompt = self.get_healthcare_system_prompt()
                if context_info:
                    system_prompt += f"\n\nPatient Context:\n{context_info}"
                
                response = await self._get_gemini_response_stream(system_prompt, message, websocket, conversation_history)
                return response
            else:
                # Fallback to regular response if streaming not available
                print("⚠️ Streaming not available, using regular response...")
                regular_response = await self.chat_with_patient(message, patient_context, conversation_history, language)
                return regular_response.get("response", "I'm sorry, I couldn't process your request.")
                
        except Exception as e:
            logger.error(f"Error in streaming chat generation: {e}")
            # Send error message via websocket if available
            if websocket:
                error_msg = {
                    "type": "ai_message",
                    "message": "I apologize, but I'm having trouble processing your message right now. Please try again or contact your healthcare provider if this is urgent.",
                    "timestamp": datetime.utcnow().isoformat(),
                    "sender": "ai",
                    "error": True
                }
                await websocket.send_text(json.dumps(error_msg))
            return "I apologize, but I'm having trouble processing your message right now."
    
    async def get_health_advice(self, message: str, patient_context: Dict[str, Any] = None, 
                               conversation_context: str = None, language: str = "en") -> str:
        """Get health advice from LLM"""
        try:
            system_prompt = self.get_healthcare_system_prompt()
            
            if patient_context:
                system_prompt += f"\n\nPatient Context:\n{patient_context}"
            
            if conversation_context:
                system_prompt += f"\n\nRecent Conversation:\n{conversation_context}"
            
            # Route to appropriate AI provider
            if self.ai_provider == "gemini":
                return await self._get_gemini_response(system_prompt, message)
            elif self.ai_provider == "perplexity":
                return await self._get_perplexity_response(system_prompt, message)
            elif self.ai_provider == "openai":
                return await self._get_openai_response(system_prompt, message)
            else:
                return self._generate_fallback_response(message, patient_context)
            
        except Exception as e:
            logger.error(f"Error getting health advice: {e}")
            return self._generate_fallback_response(message, patient_context)

    async def _get_gemini_response(self, system_prompt: str, message: str) -> str:
        """Get response from Google Gemini"""
        try:
            full_prompt = f"{system_prompt}\n\nPatient: {message}\nHealthcare Assistant:"
            print(f"🔮 Calling Gemini with prompt length: {len(full_prompt)}")
            
            response = await self.gemini_model.generate_content_async(full_prompt)
            print(f"✅ Gemini response received: {response.text[:100]}...")
            return response.text.strip()
        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            logger.error(f"Gemini API error: {e}")
            return self._generate_improved_fallback_response(message)

    async def _get_gemini_response_stream(self, system_prompt: str, message: str, websocket, conversation_history: List[Dict[str, str]] = None):
        """Get streaming response from Google Gemini with conversation memory"""
        try:
            # Build conversation context with memory
            conversation_context = ""
            if conversation_history:
                print(f"🧠 Building conversation memory from {len(conversation_history)} previous messages")
                # Include last 10 messages for context (5 exchanges)
                recent_messages = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
                
                for msg in recent_messages:
                    role = "Patient" if msg.get('sender') != 'ai' else "Healthcare Assistant"
                    message_text = msg.get('message', '')
                    timestamp = msg.get('timestamp', '')
                    conversation_context += f"\n{role}: {message_text}"
                
                print(f"📝 Conversation context length: {len(conversation_context)} characters")
            
            # Build full prompt with conversation memory
            if conversation_context:
                full_prompt = f"{system_prompt}\n\n=== PREVIOUS CONVERSATION ===\n{conversation_context}\n\n=== CURRENT QUERY ===\nPatient: {message}\nHealthcare Assistant:"
            else:
                full_prompt = f"{system_prompt}\n\nPatient: {message}\nHealthcare Assistant:"
                
            print(f"🔮 Calling Gemini STREAM with prompt length: {len(full_prompt)}")
            
            # Use streaming response
            response = await self.gemini_model.generate_content_async(
                full_prompt,
                stream=True
            )
            
            full_response = ""
            async for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    # Send streaming chunk to client
                    stream_msg = {
                        "type": "ai_stream",
                        "message": full_response,  # Send accumulated text
                        "is_complete": False,
                        "timestamp": datetime.utcnow().isoformat(),
                        "sender": "ai"
                    }
                    await websocket.send_text(json.dumps(stream_msg))
                    
            # Send final complete message
            final_msg = {
                "type": "ai_message",
                "message": full_response.strip(),
                "is_complete": True,
                "timestamp": datetime.utcnow().isoformat(),
                "sender": "ai",
                "confidence": 0.9
            }
            await websocket.send_text(json.dumps(final_msg))
            print(f"✅ Gemini streaming complete: {len(full_response)} chars")
            return full_response.strip()
            
        except Exception as e:
            print(f"❌ Gemini streaming error: {e}")
            logger.error(f"Gemini streaming error: {e}")
            fallback_response = self._generate_improved_fallback_response(message)
            
            # Send fallback as regular message
            fallback_msg = {
                "type": "ai_message", 
                "message": fallback_response,
                "timestamp": datetime.utcnow().isoformat(),
                "sender": "ai",
                "error": True
            }
            await websocket.send_text(json.dumps(fallback_msg))
            return fallback_response

    async def _get_perplexity_response(self, system_prompt: str, message: str) -> str:
        """Get response from Perplexity AI"""
        try:
            headers = {
                "Authorization": f"Bearer {self.perplexity_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "llama-3.1-sonar-small-128k-online",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                "temperature": 0.3,
                "max_tokens": 1000
            }
            
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
            else:
                logger.error(f"Perplexity API error: {response.status_code}")
                return self._generate_fallback_response(message)
                
        except Exception as e:
            logger.error(f"Perplexity API error: {e}")
            return self._generate_fallback_response(message)

    async def _get_openai_response(self, system_prompt: str, message: str) -> str:
        """Get response from OpenAI"""
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=message)
            ]
            
            response = await self.openai_model.agenerate([messages])
            return response.generations[0][0].text.strip()
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return self._generate_fallback_response(message)

    def _generate_fallback_response(self, message: str, patient_context: Dict[str, Any] = None) -> str:
        """Generate fallback response when AI is not available"""
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
    
    def _generate_improved_fallback_response(self, message: str, patient_context: Dict[str, Any] = None) -> str:
        """Generate improved, more helpful fallback responses"""
        message_lower = message.lower()
        
        # CRITICAL EMERGENCY RESPONSES - Must be first!
        if any(word in message_lower for word in ['heart attack', 'chest pain', 'can\'t breathe', 'difficulty breathing', 'stroke', 'seizure', 'unconscious', 'bleeding heavily', 'severe pain']):
            return """🚨 **MEDICAL EMERGENCY** 🚨

**CALL EMERGENCY SERVICES IMMEDIATELY:**
• Call 911 (US) or your local emergency number
• Do not wait - seek immediate medical attention
• If possible, have someone drive you to the nearest emergency room

**For chest pain/heart attack symptoms:**
• Stop all activity and rest
• Take prescribed nitroglycerin if you have it
• Chew an aspirin if not allergic (unless told otherwise by doctor)
• Stay calm and wait for emergency help

**This is a potential life-threatening emergency. Do not delay seeking professional medical care.**"""

        # Headache responses
        if any(word in message_lower for word in ['headache', 'head ache', 'migraine']):
            return """For headaches, here are some helpful approaches:

**Immediate relief:**
• Stay hydrated - drink water slowly
• Rest in a quiet, dark room
• Apply a cold compress to your forehead or warm compress to neck
• Try gentle neck and shoulder stretches
• Consider over-the-counter pain relievers if appropriate

**Common triggers to avoid:**
• Dehydration, lack of sleep, stress, bright lights, certain foods

**When to seek care:** If you have severe headaches, sudden onset, fever, vision changes, or headaches that worsen over time.

Would you like specific tips for any particular type of headache?"""
        
        # Pain responses
        if any(word in message_lower for word in ['pain', 'hurt', 'ache', 'sore']) and 'head' not in message_lower:
            return """I understand you're experiencing pain. Here's some general guidance:

**For minor pain:**
• Rest the affected area
• Apply ice for acute injuries (first 24-48 hours) or heat for muscle tension
• Gentle movement and stretching when tolerated
• Over-the-counter pain relievers as directed

**Pain management tips:**
• Keep a pain diary to track patterns
• Practice relaxation techniques
• Maintain good posture
• Stay active within your comfort level

**Seek medical attention if:** Pain is severe, sudden, or accompanied by other concerning symptoms like fever, swelling, or numbness.

What type of pain are you experiencing? I can provide more specific guidance."""
        
        # Cold/flu responses
        if any(word in message_lower for word in ['cold', 'flu', 'cough', 'congestion', 'runny nose']):
            return """For cold and flu symptoms, here's what can help:

**Symptom relief:**
• Rest and get plenty of sleep
• Drink warm liquids (tea, broth, warm water with honey)
• Use a humidifier or breathe steam from a hot shower
• Gargle with salt water for sore throat
• Consider over-the-counter medications for specific symptoms

**Recovery support:**
• Eat nutritious foods when you have appetite
• Wash hands frequently
• Stay home to rest and avoid spreading illness

**When to see a doctor:** High fever (over 101.3°F), difficulty breathing, severe headache, or symptoms lasting more than 10 days.

What specific symptoms are bothering you most?"""
        
        # Fever responses
        if any(word in message_lower for word in ['fever', 'temperature', 'hot', 'chills']):
            return """For fever management:

**Comfort measures:**
• Rest and stay hydrated with water, clear broths, or electrolyte drinks
• Dress lightly and keep room temperature comfortable
• Take lukewarm baths or use cool, damp cloths
• Consider fever-reducing medications if comfortable

**Monitor your temperature** and note any other symptoms.

**Seek immediate care if:**
• Fever over 103°F (39.4°C)
• Difficulty breathing or chest pain
• Severe headache or neck stiffness
• Persistent vomiting
• Signs of dehydration

How high is your fever, and do you have any other symptoms?"""
        
        # Sleep issues
        if any(word in message_lower for word in ['sleep', 'tired', 'fatigue', 'insomnia']):
            return """For better sleep and energy:

**Sleep hygiene tips:**
• Keep a consistent sleep schedule
• Create a relaxing bedtime routine
• Keep bedroom cool, dark, and quiet
• Avoid screens 1 hour before bed
• Limit caffeine after 2 PM

**For daytime fatigue:**
• Ensure you're getting 7-9 hours of sleep
• Stay hydrated and eat regular, balanced meals
• Get some sunlight and fresh air
• Consider if stress or medications might be affecting sleep

**When to seek help:** If sleep problems persist for more than 2 weeks or significantly impact your daily life.

What specific sleep challenges are you facing?"""
        
        # Stress/anxiety responses
        if any(word in message_lower for word in ['stress', 'anxiety', 'worried', 'anxious']):
            return """For stress and anxiety management:

**Immediate techniques:**
• Deep breathing: 4 counts in, hold for 4, out for 6
• Progressive muscle relaxation
• Take a short walk or do gentle stretching
• Practice mindfulness or meditation

**Long-term strategies:**
• Regular exercise and good sleep habits
• Limit caffeine and alcohol
• Connect with supportive friends or family
• Consider journaling or creative activities

**Professional support** can be very helpful for ongoing stress or anxiety.

What's been causing you the most stress lately? Sometimes talking through it can help."""
        
        # General wellness
        if any(word in message_lower for word in ['healthy', 'wellness', 'tips', 'advice']):
            return """Here are some key wellness tips:

**Daily habits:**
• Aim for 7-9 hours of quality sleep
• Eat a variety of colorful fruits and vegetables
• Stay hydrated with water throughout the day
• Move your body regularly - even 10-minute walks help
• Practice stress management techniques

**Preventive care:**
• Keep up with regular check-ups and screenings
• Stay up to date with vaccinations
• Practice good hygiene
• Limit alcohol and avoid smoking

**Mental wellness:**
• Stay connected with others
• Engage in activities you enjoy
• Practice gratitude and mindfulness

What aspect of your health would you like to focus on improving?"""
        
        # Default helpful response
        return """I'm here to help with your health questions! I can provide information about:

• Common symptoms and self-care measures
• Wellness tips and healthy lifestyle habits
• When to seek medical care
• General health education

What specific health topic or concern would you like to discuss? The more details you can share, the better I can assist you."""
    
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
