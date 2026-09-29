import time
import requests
import random

API_ENDPOINT = "http://127.0.0.1:8000/cv/update"

active_devotees = []
for i in range(25):
    active_devotees.append({
        "id": f"PID-{random.randint(1000, 9999)}",
        "start_time": time.time() - random.randint(300, 2400),
        "zone": random.choice(["Main Gate", "Shoe Rack", "Waiting Hall A", "Inner Sanctum"])
    })

print("Starting High-End Multi-Camera Re-ID Mock Feed...")
while True:
    try:
        is_surge = random.random() > 0.7
        expected = 120
        
        # Simulate people moving between cameras
        for d in active_devotees:
            if random.random() > 0.8:
                d["zone"] = random.choice(["Main Gate", "Shoe Rack", "Waiting Hall A", "Inner Sanctum"])
        
        matches = []
        # Sample random devotees detected in this frame across cameras
        for d in random.sample(active_devotees, 6):
            journey_mins = int((time.time() - d["start_time"]) / 60)
            matches.append({
                "person_id": d["id"],
                "journey_time_mins": max(1, journey_mins),
                "current_zone": d["zone"]
            })
            
        cameras = [
            {"camera_id": "CAM-01", "zone_name": "Main Gate", "crowd_count": random.randint(10, 25)},
            {"camera_id": "CAM-02", "zone_name": "Shoe Rack", "crowd_count": random.randint(15, 35)},
            {"camera_id": "CAM-03", "zone_name": "Waiting Hall", "crowd_count": random.randint(30, 60) if is_surge else random.randint(15, 30)},
            {"camera_id": "CAM-04", "zone_name": "Inner Sanctum", "crowd_count": random.randint(20, 45) if is_surge else random.randint(10, 25)}
        ]
        
        total = sum(c["crowd_count"] for c in cameras)
        
        payload = {
            "detected_crowd": total, 
            "expected_devotees": expected,
            "cameras": cameras,
            "reid_matches": matches
        }
        requests.post(API_ENDPOINT, json=payload)
    except Exception as e:
        print("Waiting for server...", e)
    time.sleep(2.5)
