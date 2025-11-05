<div align="center">

# 🏥 Smart Health AI Platform

### *Revolutionizing Healthcare Through Artificial Intelligence*

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248.svg)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*An enterprise-grade, AI-powered healthcare platform that transforms patient care through intelligent diagnostics, predictive analytics, and seamless doctor-AI collaboration.*

[🚀 Live Demo](#) • [📖 Documentation](#) • [🎯 Features](#features) • [⚡ Quick Start](#quick-start)

</div>

---

## 🌟 Overview

Smart Health AI is a comprehensive healthcare ecosystem that leverages cutting-edge artificial intelligence to deliver personalized medical insights, predictive health analytics, and intelligent care coordination. Built for healthcare providers, patients, and administrators, our platform bridges the gap between traditional healthcare and the future of AI-driven medicine.

### 🎯 Key Highlights

- **🤖 Advanced AI Integration** - Multi-LLM support with Google Gemini, OpenAI, and Perplexity
- **📊 Predictive Analytics** - ML-powered disease risk assessment and prevention strategies  
- **🔒 Enterprise Security** - HIPAA-compliant with blockchain audit trails
- **⚡ Real-time Collaboration** - WebSocket-powered doctor-patient-AI interactions
- **📱 Cross-platform** - Responsive design optimized for all devices
- **🌐 Multilingual Support** - Global healthcare accessibility

## ✨ Features

### 🏥 **For Healthcare Providers**
- **AI-Assisted Diagnostics** - Intelligent symptom analysis and differential diagnosis suggestions
- **Patient Management Dashboard** - Comprehensive patient overview with predictive insights
- **Clinical Decision Support** - Evidence-based recommendations powered by medical AI
- **Real-time Notifications** - Instant alerts for critical patient conditions
- **Analytics & Reporting** - Advanced healthcare metrics and outcome tracking

### 👥 **For Patients**
- **Comprehensive Health Assessment** - 25+ factor health scoring algorithm
- **AI Health Assistant** - 24/7 multilingual medical guidance and support
- **Personalized Recommendations** - Tailored lifestyle and treatment suggestions
- **Health Metrics Tracking** - Dynamic monitoring of vitals, labs, and wellness indicators
- **Appointment Management** - Seamless consultation booking and history tracking
- **Medication Management** - Smart reminders and adherence tracking

### 🔧 **For Administrators**
- **System Analytics** - Platform usage insights and performance metrics
- **User Management** - Role-based access control and security oversight
- **Audit Trails** - Blockchain-secured activity logging and compliance reporting
- **Configuration Management** - System-wide settings and customization options

## 🛠️ Technology Stack

### **Frontend Architecture**
```typescript
Next.js 14 + React 18 + TypeScript
├── UI Framework: Tailwind CSS + Radix UI + shadcn/ui
├── State Management: React Hooks + Context API
├── Real-time: WebSocket integration
└── Authentication: JWT with role-based routing
```

### **Backend Infrastructure**
```python
FastAPI + Python 3.9+
├── Database: MongoDB with Motor (async)
├── AI/ML: PyTorch + scikit-learn + transformers
├── LLM Integration: LangChain + Multiple providers
├── Security: JWT + bcrypt + CORS
└── Real-time: WebSocket + async processing
```

### **AI & Machine Learning**
```python
Multi-Model Architecture
├── Health Risk Prediction: Custom ML models (diabetes, hypertension, heart disease)
├── LLM Providers: Google Gemini, OpenAI GPT, Perplexity, Local fallback
├── Natural Language: Multilingual healthcare chat processing
└── Predictive Analytics: Time-series health trend analysis
```

### **Security & Compliance**
```bash
Enterprise-Grade Security
├── Authentication: JWT with refresh tokens
├── Authorization: Role-based access control (RBAC)
├── Data Protection: AES encryption + secure storage
├── Audit Trails: Blockchain simulation for immutable logs
└── Compliance: HIPAA-ready data handling protocols
```

## 📁 Project Architecture

```bash
smart-health-ai/
├── 🔧 backend/                 # FastAPI Backend Services
│   ├── api/                    # RESTful API endpoints & WebSocket handlers
│   │   ├── routes/            # Modular route definitions
│   │   ├── middleware/        # Custom middleware & CORS handling
│   │   └── websocket/         # Real-time communication handlers
│   ├── models/                # Pydantic models & database schemas
│   ├── services/              # Business logic & external integrations
│   ├── ml/                    # Machine learning models & algorithms
│   │   ├── health_prediction/ # Disease risk prediction models
│   │   ├── llm_integration/   # LLM provider abstractions
│   │   └── analytics/         # Health analytics & insights
│   ├── auth/                  # Authentication & authorization
│   ├── database/              # MongoDB connection & utilities
│   └── blockchain/            # Audit trail & security logging
│
├── 🎨 frontend/               # Next.js Frontend Application
│   ├── app/                   # App Router (Next.js 14)
│   │   ├── auth/             # Authentication pages
│   │   ├── dashboard/        # Role-based dashboards
│   │   └── api/              # API route handlers
│   ├── components/           # Reusable React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── forms/            # Form components & validation
│   │   └── charts/           # Data visualization components
│   ├── lib/                  # Utility functions & configurations
│   └── styles/               # Global styles & Tailwind config
│
├── 🐳 docker/                # Containerization & deployment
├── 📊 docs/                  # Documentation & API specs
└── 🧪 tests/                 # Automated testing suites
```

## ⚡ Quick Start

### Prerequisites
- **Python 3.9+** with pip
- **Node.js 18+** with npm/yarn
- **MongoDB 6.0+** (local or cloud)
- **Git** for version control

### 🚀 Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/SiddarthDuraisamy/Smart-health-AI.git
   cd Smart-health-AI
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Configure environment
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**
   ```bash
   # Ensure MongoDB is running
   # The application will auto-create collections on first run
   ```

5. **Start the Application**
   ```bash
   # Terminal 1: Start Backend
   cd backend
   uvicorn main:app --reload --port 8000
   
   # Terminal 2: Start Frontend
   cd frontend
   npm run dev
   ```

6. **Access the Platform**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **Interactive API**: http://localhost:8000/redoc

### 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run individual services
docker build -t smart-health-backend ./backend
docker build -t smart-health-frontend ./frontend
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database Configuration
MONGODB_URL=mongodb://localhost:27017/smart_health_ai
DATABASE_NAME=smart_health_ai

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# AI/ML Integration
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-gemini-key
PERPLEXITY_API_KEY=your-perplexity-key
HUGGINGFACE_API_KEY=your-huggingface-key

# Application Settings
DEBUG=True
CORS_ORIGINS=["http://localhost:3000"]
```

#### Frontend (.env.local)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Application Settings
NEXT_PUBLIC_APP_NAME="Smart Health AI"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

## 📊 API Documentation

Our comprehensive API provides RESTful endpoints and real-time WebSocket connections:

- **📖 Interactive Docs**: http://localhost:8000/docs (Swagger UI)
- **📋 Alternative Docs**: http://localhost:8000/redoc (ReDoc)
- **🔌 WebSocket**: ws://localhost:8000/ws/{connection_type}

### Key API Endpoints

```bash
# Authentication
POST   /api/v1/auth/register     # User registration
POST   /api/v1/auth/login        # User authentication
GET    /api/v1/auth/me           # Current user profile

# Health Records
POST   /api/v1/health-records/   # Create health record
GET    /api/v1/health-records/latest  # Get latest record
GET    /api/v1/health-records/health-score  # Get health score

# Consultations
POST   /api/v1/consultations/    # Book consultation
GET    /api/v1/consultations/my-consultations  # User consultations
PATCH  /api/v1/consultations/{id}/status  # Update status

# AI Assistant
POST   /api/v1/ai/chat          # AI chat interaction
POST   /api/v1/ai/health-assessment  # AI health analysis

# Real-time Features
WS     /ws/chat/{user_id}       # Real-time chat
WS     /ws/notifications/{user_id}  # Live notifications
```

## 👥 User Roles & Permissions

### 🏥 **Healthcare Providers (Doctors)**
- Full patient data access within assigned cases
- AI-assisted diagnostic tools and recommendations
- Consultation management and scheduling
- Clinical decision support systems
- Patient communication and care coordination

### 👤 **Patients**
- Personal health data management and tracking
- AI health assistant and 24/7 support
- Appointment booking and medical history
- Medication management and reminders
- Health insights and personalized recommendations

### 🔧 **System Administrators**
- User management and role assignments
- System analytics and performance monitoring
- Security oversight and audit trail access
- Platform configuration and customization
- Compliance reporting and data governance

## 🔒 Security & Compliance

### 🛡️ **Security Features**
- **Authentication**: JWT-based with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: AES-256 encryption for sensitive data
- **API Security**: Rate limiting, CORS, and input validation
- **Audit Logging**: Blockchain-simulated immutable audit trails

### 📋 **Compliance Standards**
- **HIPAA Ready**: Healthcare data privacy and security
- **GDPR Compliant**: European data protection regulations
- **SOC 2**: Security and availability controls
- **ISO 27001**: Information security management

### 🔐 **Data Protection**
```bash
Security Layers
├── 🌐 Network: HTTPS/TLS encryption
├── 🔑 Authentication: Multi-factor authentication support
├── 🛡️ Authorization: Granular permission system
├── 💾 Storage: Encrypted database fields
└── 📝 Audit: Comprehensive activity logging
```

## 📱 Cross-Platform Compatibility

- **💻 Desktop**: Optimized for Windows, macOS, and Linux
- **📱 Mobile**: Responsive design for iOS and Android browsers
- **📟 Tablet**: Touch-optimized interface for tablet devices
- **🌐 Browsers**: Chrome, Firefox, Safari, Edge support
- **♿ Accessibility**: WCAG 2.1 AA compliance

## 🚀 Performance & Scalability

- **⚡ Fast Loading**: Optimized bundle sizes and lazy loading
- **🔄 Real-time**: WebSocket connections for instant updates
- **📊 Caching**: Redis integration for improved performance
- **🌍 CDN Ready**: Static asset optimization and distribution
- **📈 Scalable**: Microservices architecture for horizontal scaling

## 🤝 Contributing

We welcome contributions from the healthcare and developer community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow
- Pull request process
- Issue reporting
- Security vulnerability disclosure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Healthcare professionals who provided domain expertise
- Open-source community for foundational technologies
- AI/ML researchers advancing healthcare applications
- Beta testers and early adopters for valuable feedback

---

<div align="center">

### 🌟 **Built with ❤️ for the Future of Healthcare** 🌟

*Empowering healthcare providers and patients through intelligent technology*

**[⭐ Star this repo](https://github.com/SiddarthDuraisamy/Smart-health-AI)** • **[🐛 Report Bug](https://github.com/SiddarthDuraisamy/Smart-health-AI/issues)** • **[💡 Request Feature](https://github.com/SiddarthDuraisamy/Smart-health-AI/issues)**

</div>
