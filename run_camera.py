import cv2
import requests
import time
import math
from collections import OrderedDict

# URL to your FastAPI backend
API_URL = "http://127.0.0.1:8000/cv/update"

EXPECTED_DEVOTEES = 5
LINE_POSITION = 240 # The y-coordinate of our virtual tripwire

class SimpleCentroidTracker:
    def __init__(self, max_disappeared=15, max_distance=50):
        self.next_object_id = 0
        self.objects = OrderedDict() # id: (cx, cy)
        self.disappeared = OrderedDict() # id: count
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid):
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.next_object_id += 1

    def deregister(self, object_id):
        del self.objects[object_id]
        del self.disappeared[object_id]

    def update(self, rects):
        if len(rects) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects

        input_centroids = []
        for (x, y, w, h) in rects:
            cx = int(x + w / 2.0)
            cy = int(y + h / 2.0)
            input_centroids.append((cx, cy))

        if len(self.objects) == 0:
            for i in range(len(input_centroids)):
                self.register(input_centroids[i])
        else:
            object_ids = list(self.objects.keys())
            object_centroids = list(self.objects.values())

            # Compute distances between existing objects and input centroids
            import numpy as np
            D = np.zeros((len(object_centroids), len(input_centroids)))
            for i, oc in enumerate(object_centroids):
                for j, ic in enumerate(input_centroids):
                    D[i, j] = math.dist(oc, ic)

            used_rows = set()
            used_cols = set()

            for _ in range(min(D.shape)):
                # Find min distance
                min_val = np.min(D)
                if min_val > self.max_distance:
                    break
                row, col = np.unravel_index(D.argmin(), D.shape)
                
                object_id = object_ids[row]
                self.objects[object_id] = input_centroids[col]
                self.disappeared[object_id] = 0
                
                used_rows.add(row)
                used_cols.add(col)
                D[row, :] = float('inf')
                D[:, col] = float('inf')

            unused_rows = set(range(0, D.shape[0])).difference(used_rows)
            unused_cols = set(range(0, D.shape[1])).difference(used_cols)

            for row in unused_rows:
                object_id = object_ids[row]
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)

            for col in unused_cols:
                self.register(input_centroids[col])

        return self.objects


def main():
    print("Initializing Smart Temple Hybrid AI Camera...")
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not access the webcam.")
        return

    last_update_time = 0
    update_interval = 2.0
    
    tracker = SimpleCentroidTracker()
    total_entered = 0
    tracked_states = {} # object_id: last_y

    print("Camera active. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.resize(frame, (640, 480))
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 1. DENSITY ESTIMATION (YOLO-style bounding boxes)
        boxes = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        person_count = len(boxes)

        for (x, y, w, h) in boxes:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
        # 2. FOOTFALL TRACKING (Line Crossing)
        objects = tracker.update(boxes)
        
        # Draw the virtual tripwire
        cv2.line(frame, (0, LINE_POSITION), (640, LINE_POSITION), (0, 255, 255), 2)
        cv2.putText(frame, "ENTRANCE GATE (VIRTUAL TRIPWIRE)", (10, LINE_POSITION - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

        for (object_id, centroid) in objects.items():
            cx, cy = centroid
            
            # Draw tracking ID and dot
            cv2.circle(frame, (cx, cy), 4, (255, 0, 0), -1)
            cv2.putText(frame, f"ID: {object_id}", (cx - 10, cy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
            
            # Line crossing logic
            if object_id in tracked_states:
                last_y = tracked_states[object_id]
                # If they moved from above the line to below the line
                if last_y < LINE_POSITION and cy >= LINE_POSITION:
                    total_entered += 1
                    print(f"Devotee {object_id} crossed the gate! Total Walk-ins: {total_entered}")
            
            tracked_states[object_id] = cy

        # Draw Stats
        status_color = (0, 0, 255) if person_count > EXPECTED_DEVOTEES else (0, 255, 0)
        cv2.putText(frame, f"Congestion (Zone A): {person_count}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
        cv2.putText(frame, f"Footfall Count: {total_entered}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 165, 0), 2)

        cv2.imshow("Smart Temple - Hybrid AI Camera", frame)

        # Send data to backend (Density)
        current_time = time.time()
        if current_time - last_update_time > update_interval:
            last_update_time = current_time
            try:
                requests.post(API_URL, json={
                    "detected_crowd": person_count,
                    "expected_devotees": EXPECTED_DEVOTEES
                }, timeout=1)
            except Exception:
                pass 

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
