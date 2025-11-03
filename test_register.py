"""
Test registration endpoint
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

# Test OPTIONS request
print("Testing OPTIONS request...")
try:
    options_response = requests.options(
        "http://localhost:8000/api/v1/auth/register",
        headers={"Origin": "http://127.0.0.1:64933"}
    )
    print(f"OPTIONS Status: {options_response.status_code}")
    print(f"OPTIONS Headers: {dict(options_response.headers)}")
except Exception as e:
    print(f"OPTIONS Error: {e}")

# Test POST request
print("\nTesting POST request...")
try:
    post_response = requests.post(
        "http://localhost:8000/api/v1/auth/register",
        json=test_user,
        headers={
            "Content-Type": "application/json",
            "Origin": "http://127.0.0.1:64933"
        }
    )
    print(f"POST Status: {post_response.status_code}")
    print(f"POST Headers: {dict(post_response.headers)}")
    print(f"POST Response: {post_response.text}")
except Exception as e:
    print(f"POST Error: {e}")
