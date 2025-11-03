# Smart Health Consulting Services

## 🏥 AI-Driven Healthcare Platform

A comprehensive full-stack healthcare platform that provides personalized medical consulting, AI-assisted diagnostics, predictive analytics, and doctor-AI collaboration.

## 🚀 Features

- **AI Health Assistant**: Personalized health recommendations using ML models
- **LLM Communication Engine**: Multilingual patient chat with healthcare LLM
- **Predictive Analytics**: Disease risk prediction and preventive care plans
- **Doctor-AI Collaboration**: Integrated dashboard for healthcare professionals
- **Blockchain Security**: Secure patient data management with audit trails
- **Smart Lifestyle Companion**: Real-time health tracking and wellness goals

## 🛠️ Tech Stack

- **Frontend**: React.js with Tailwind CSS and shadcn/ui
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **AI/ML**: transformers, scikit-learn, pandas, numpy, torch, langchain
- **Security**: JWT authentication + Blockchain simulation
- **DevOps**: Docker containerization

## 📁 Project Structure

```
/backend
  /api          # FastAPI routes and endpoints
  /models       # Database models and schemas
  /services     # Business logic services
  /ml           # Machine learning modules
  /auth         # Authentication and authorization
/frontend
  /components   # React components
  /pages        # Application pages
  /utils        # Utility functions
/database
  /schemas      # MongoDB schemas
  /seed         # Sample data
/blockchain
  /ledger       # Blockchain simulation
/docker         # Docker configuration
```

## 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   cd "Smart Health Consulting Services"
   pip install -r requirements.txt
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Run the Application**
   ```bash
   # Backend
   cd backend
   uvicorn main:app --reload

   # Frontend
   cd frontend
   npm run dev
   ```

## 🔧 Configuration

Create a `.env` file with the following variables:
- `MONGODB_URL`: MongoDB connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key for LLM integration
- `HUGGINGFACE_API_KEY`: HuggingFace API key for ML models

## 📊 API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## 🏥 User Roles

- **Patient**: Access personal health data, chat with AI, view recommendations
- **Doctor**: Review patient data, collaborate with AI, validate diagnoses
- **Admin**: Manage system users and monitor platform analytics

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Blockchain audit trails
- Encrypted patient data storage
- HIPAA-compliant data handling

## 📱 Mobile Responsive

The platform is fully responsive and optimized for mobile devices, tablets, and desktops.

---

Built with ❤️ for the future of healthcare
