// MongoDB initialization script for Docker
db = db.getSiblingDB('smart_health_db');

// Create collections
db.createCollection('users');
db.createCollection('patients');
db.createCollection('doctors');
db.createCollection('consultations');
db.createCollection('health_records');
db.createCollection('ai_predictions');
db.createCollection('blockchain_ledger');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });

db.patients.createIndex({ "user_id": 1 }, { unique: true });
db.patients.createIndex({ "medical_record_number": 1 }, { unique: true });

db.doctors.createIndex({ "user_id": 1 }, { unique: true });
db.doctors.createIndex({ "license_number": 1 }, { unique: true });
db.doctors.createIndex({ "specializations": 1 });

db.consultations.createIndex({ "patient_id": 1 });
db.consultations.createIndex({ "doctor_id": 1 });
db.consultations.createIndex({ "scheduled_at": 1 });
db.consultations.createIndex({ "status": 1 });

db.health_records.createIndex({ "patient_id": 1 });
db.health_records.createIndex({ "record_type": 1 });
db.health_records.createIndex({ "created_at": 1 });

db.ai_predictions.createIndex({ "patient_id": 1 });
db.ai_predictions.createIndex({ "prediction_type": 1 });
db.ai_predictions.createIndex({ "created_at": 1 });

db.blockchain_ledger.createIndex({ "transaction_hash": 1 }, { unique: true });
db.blockchain_ledger.createIndex({ "patient_id": 1 });
db.blockchain_ledger.createIndex({ "timestamp": 1 });

print('Smart Health database initialized successfully!');
