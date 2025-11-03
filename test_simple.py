"""
Test simple registration endpoint
"""
import requests
import json

# Test data
test_user = {
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User",
    "role": "patient"
}

# Test simple endpoint
print("Testing simple test-register endpoint...")
try:
    response = requests.post(
        "http://localhost:8000/api/v1/auth/test-register",
        json=test_user,
        headers={
            "Content-Type": "application/json",
            "Origin": "http://127.0.0.1:64933"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
