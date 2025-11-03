#!/usr/bin/env python3
"""
Smart Health Consulting Services - Setup and Initialization Script
"""

import asyncio
import os
import sys
import subprocess
from pathlib import Path

def print_header():
    print("=" * 60)
    print("🏥 Smart Health Consulting Services - Setup")
    print("=" * 60)
    print()

def check_requirements():
    """Check if required software is installed"""
    print("📋 Checking requirements...")
    
    requirements = {
        'python': 'python --version',
        'node': 'node --version',
        'npm': 'npm --version',
        'docker': 'docker --version',
        'docker-compose': 'docker-compose --version'
    }
    
    missing = []
    for name, command in requirements.items():
        try:
            result = subprocess.run(command.split(), capture_output=True, text=True)
            if result.returncode == 0:
                version = result.stdout.strip()
                print(f"  ✅ {name}: {version}")
            else:
                missing.append(name)
                print(f"  ❌ {name}: Not found")
        except FileNotFoundError:
            missing.append(name)
            print(f"  ❌ {name}: Not found")
    
    if missing:
        print(f"\n⚠️  Missing requirements: {', '.join(missing)}")
        print("Please install the missing software before continuing.")
        return False
    
    print("✅ All requirements satisfied!")
    return True

def setup_environment():
    """Setup environment files"""
    print("\n🔧 Setting up environment...")
    
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists() and env_example.exists():
        print("  📝 Creating .env file from .env.example...")
        with open(env_example, 'r') as src, open(env_file, 'w') as dst:
            content = src.read()
            dst.write(content)
        print("  ✅ .env file created")
        print("  ⚠️  Please update .env with your API keys and configuration")
    else:
        print("  ℹ️  .env file already exists")

def install_backend_dependencies():
    """Install Python backend dependencies"""
    print("\n🐍 Installing backend dependencies...")
    
    try:
        os.chdir("backend")
        result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("  ✅ Backend dependencies installed")
        else:
            print(f"  ❌ Error installing backend dependencies: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False
    finally:
        os.chdir("..")
    
    return True

def install_frontend_dependencies():
    """Install Node.js frontend dependencies"""
    print("\n📦 Installing frontend dependencies...")
    
    try:
        os.chdir("frontend")
        result = subprocess.run(["npm", "install"], capture_output=True, text=True)
        if result.returncode == 0:
            print("  ✅ Frontend dependencies installed")
        else:
            print(f"  ❌ Error installing frontend dependencies: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False
    finally:
        os.chdir("..")
    
    return True

async def seed_database():
    """Seed the database with sample data"""
    print("\n🌱 Seeding database with sample data...")
    
    try:
        os.chdir("backend")
        # Import and run the seed function
        sys.path.append(os.getcwd())
        from database.seed_data import seed_database
        await seed_database()
        print("  ✅ Database seeded successfully")
    except Exception as e:
        print(f"  ❌ Error seeding database: {e}")
        return False
    finally:
        os.chdir("..")
    
    return True

def print_instructions():
    """Print setup completion instructions"""
    print("\n" + "=" * 60)
    print("🎉 Setup Complete!")
    print("=" * 60)
    print()
    print("📋 Next Steps:")
    print()
    print("1. 🔑 Configure API Keys (Optional but recommended):")
    print("   - Edit .env file")
    print("   - Add your OpenAI API key for enhanced AI features")
    print("   - Add your HuggingFace API key for ML models")
    print()
    print("2. 🚀 Start the application:")
    print()
    print("   Option A - Using Docker (Recommended):")
    print("   docker-compose up -d")
    print()
    print("   Option B - Manual startup:")
    print("   # Terminal 1 - Start MongoDB")
    print("   mongod")
    print()
    print("   # Terminal 2 - Start Backend")
    print("   cd backend")
    print("   python -m uvicorn main:app --reload")
    print()
    print("   # Terminal 3 - Start Frontend")
    print("   cd frontend")
    print("   npm run dev")
    print()
    print("3. 🌐 Access the application:")
    print("   - Frontend: http://localhost:3000")
    print("   - Backend API: http://localhost:8000")
    print("   - API Documentation: http://localhost:8000/docs")
    print()
    print("4. 👤 Demo Login Credentials:")
    print("   - Patient: john.doe@email.com / patient123")
    print("   - Doctor: dr.sarah.wilson@hospital.com / doctor123")
    print("   - Admin: admin@smarthealth.com / admin123")
    print()
    print("🏥 Welcome to Smart Health Consulting Services!")
    print("=" * 60)

def main():
    """Main setup function"""
    print_header()
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Install dependencies
    if not install_backend_dependencies():
        print("\n❌ Backend setup failed")
        sys.exit(1)
    
    if not install_frontend_dependencies():
        print("\n❌ Frontend setup failed")
        sys.exit(1)
    
    # Ask user if they want to seed the database
    print("\n🗄️  Database Setup:")
    response = input("Would you like to seed the database with sample data? (y/N): ").lower()
    
    if response in ['y', 'yes']:
        try:
            asyncio.run(seed_database())
        except Exception as e:
            print(f"⚠️  Database seeding failed: {e}")
            print("You can run this later manually with: python backend/database/seed_data.py")
    
    # Print completion instructions
    print_instructions()

if __name__ == "__main__":
    main() 