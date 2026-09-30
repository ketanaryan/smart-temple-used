import cv2
from ultralytics import YOLO
import requests
import time
import math

API_ENDPOINT = "http://127.0.0.1:8000/cv/update"

print("Loading YOLOv8 model...")
# Load the YOLOv8 Nano model
model = YOLO("yolov8n.pt")

print("Opening webcam...")
cap = cv2.VideoCapture(0)

# We will only send updates to the backend every 2 seconds to avoid spamming the API
last_update_time = time.time()
UPDATE_INTERVAL = 2.0

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break

    # Run YOLOv8 tracking on the frame, persisting tracks between frames
    # classes=0 means we only care about detecting 'person' (class 0 in COCO)
    results = model.track(frame, persist=True, classes=0, verbose=False)
    
    # Get the bounding boxes and track IDs
    boxes = results[0].boxes
    
    # Count the number of people detected in this frame
    crowd_count = len(boxes)
    
    # We can also get individual track IDs if available
    track_ids = []
    if boxes.id is not None:
        track_ids = boxes.id.int().cpu().tolist()

    # Draw the results on the frame
    annotated_frame = results[0].plot()
    
    # Overlay the crowd count
    cv2.putText(annotated_frame, f"Crowd Count: {crowd_count}", (20, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

    # Show the camera window
    cv2.imshow("Smart Temple - Real Camera Feed", annotated_frame)
    
    # Send data to the backend periodically
    current_time = time.time()
    if current_time - last_update_time >= UPDATE_INTERVAL:
        
        # Build the payload matching our new CVUpdate schema
        # We simulate the rest of the cameras, but use real data for CAM-01
        cameras = [
            {"camera_id": "CAM-01 (REAL WEBCAM)", "zone_name": "Main Gate", "crowd_count": crowd_count},
            {"camera_id": "CAM-02", "zone_name": "Shoe Rack", "crowd_count": 0},
            {"camera_id": "CAM-03", "zone_name": "Waiting Hall", "crowd_count": 0},
            {"camera_id": "CAM-04", "zone_name": "Inner Sanctum", "crowd_count": 0}
        ]
        
        # Map the real track IDs to the reid_matches!
        matches = []
        for tid in track_ids:
            matches.append({
                "person_id": f"PID-{tid:04d}",
                "journey_time_mins": 1,
                "current_zone": "Main Gate"
            })
            
        payload = {
            "detected_crowd": crowd_count,
            "expected_devotees": 120,
            "cameras": cameras,
            "reid_matches": matches
        }
        
        try:
            requests.post(API_ENDPOINT, json=payload)
        except Exception as e:
            pass # Ignore if server is down
            
        last_update_time = current_time

    # Break the loop if 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
