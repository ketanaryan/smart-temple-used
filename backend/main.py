import sys
import os
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Smart Temple Crowd and Queue Management System", root_path="/api" if os.getenv("VERCEL") else "")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from fastapi import Depends, HTTPException, status, WebSocket, WebSocketDisconnect, BackgroundTasks
    from typing import List
    from sqlalchemy.orm import Session
    from datetime import datetime, date, time, timedelta
    import models, schemas
    from database import engine, get_db, SessionLocal
    from services.queue_engine import QueueBalancer
    import uuid

    # Database tables are already initialized in Supabase
    # models.Base.metadata.create_all(bind=engine)

    from auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
    from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
    from jose import JWTError, jwt
    from auth import SECRET_KEY, ALGORITHM

    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

    @app.post("/register", response_model=schemas.User)
    def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user.password)
        db_user = models.User(email=user.email, name=user.name, hashed_password=hashed_password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise credentials_exception
        return user

    @app.post("/token", response_model=schemas.Token)
    def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    @app.get("/users/me/dashboard")
    def get_user_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
        bookings = db.query(models.Booking).filter(models.Booking.user_id == current_user.id).all()
        results = []
        for b in bookings:
            slot = db.query(models.TimeSlot).filter(models.TimeSlot.id == b.slot_id).first()
            temple = db.query(models.Temple).filter(models.Temple.id == slot.temple_id).first() if slot else None
            if not slot or not temple:
                continue
            results.append({
                "token": b.token_number,
                "status": b.status,
                "temple_name": temple.name,
                "city": temple.city,
                "date": slot.date,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "booking_time": b.booking_time
            })
        return {
            "user": {
                "name": current_user.name,
                "email": current_user.email
            },
            "bookings": results
        }

    class ConnectionManager:
        def __init__(self):
            self.active_connections: List[WebSocket] = []

        async def connect(self, websocket: WebSocket):
            await websocket.accept()
            self.active_connections.append(websocket)

        def disconnect(self, websocket: WebSocket):
            self.active_connections.remove(websocket)

        async def broadcast(self, message: dict):
            for connection in self.active_connections:
                await connection.send_json(message)

    manager = ConnectionManager()

    @app.websocket("/ws/cv-alerts")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)

    class CVUpdate(schemas.BaseModel):
        detected_crowd: int
        expected_devotees: int

    @app.post("/cv/update")
    async def update_cv_alerts(data: CVUpdate):
        status_msg = "HIGH CONGESTION" if data.detected_crowd > data.expected_devotees * 1.2 else "NORMAL"
        alert = {
            "detected_crowd": data.detected_crowd,
            "expected_devotees": data.expected_devotees,
            "status": status_msg
        }
        await manager.broadcast(alert)
        return {"message": "Alerts broadcasted"}

    @app.on_event("startup")
    def startup_event():
        db = SessionLocal()
        temple = db.query(models.Temple).first()
        if not temple:
            temple = models.Temple(name="Shri Kashi Vishwanath", city="Varanasi")
            db.add(temple)
            db.commit()
            db.refresh(temple)
            
            today = date.today()
            slots_data = [
                (time(9, 0), time(9, 30), 50),
                (time(9, 30), time(10, 0), 2),
                (time(10, 0), time(10, 30), 50),
            ]
            
            for start, end, cap in slots_data:
                slot = models.TimeSlot(temple_id=temple.id, date=today, start_time=start, end_time=end, max_capacity=cap)
                db.add(slot)
            
            for i in range(12):
                b = models.Booking(user_id=None, slot_id=1, token_number=f"ONL-{uuid.uuid4().hex[:6].upper()}", status="IN_QUEUE", is_online=True)
                db.add(b)
            for i in range(4):
                b = models.Booking(user_id=None, slot_id=1, token_number=f"WLK-{uuid.uuid4().hex[:6].upper()}", status="IN_QUEUE", is_online=False)
                db.add(b)

            db.commit()
        db.close()

    @app.get("/temples/", response_model=list[schemas.Temple])
    def read_temples(db: Session = Depends(get_db)):
        return db.query(models.Temple).all()

    @app.get("/temples/{temple_id}/slots", response_model=list[schemas.TimeSlot])
    def read_slots(temple_id: int, date_str: str = None, db: Session = Depends(get_db)):
        query = db.query(models.TimeSlot).filter(models.TimeSlot.temple_id == temple_id)
        if date_str:
            query = query.filter(models.TimeSlot.date == datetime.strptime(date_str, "%Y-%m-%d").date())
        return query.all()

    @app.post("/bookings/", response_model=schemas.Booking)
    def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
        slot = db.query(models.TimeSlot).filter(models.TimeSlot.id == booking.slot_id).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Slot not found")
        if slot.availability <= 0:
            raise HTTPException(status_code=400, detail="Slot is full")
        token = f"{'ONL' if booking.is_online else 'WLK'}-{uuid.uuid4().hex[:6].upper()}"
        db_booking = models.Booking(
            user_id=current_user.id,
            slot_id=booking.slot_id,
            is_online=booking.is_online,
            token_number=token,
            status="IN_QUEUE"
        )
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)
        return db_booking

    @app.get("/queue/status")
    def get_queue_status(db: Session = Depends(get_db)):
        online_count = db.query(models.Booking).filter(models.Booking.status == "IN_QUEUE", models.Booking.is_online == True).count()
        walkin_count = db.query(models.Booking).filter(models.Booking.status == "IN_QUEUE", models.Booking.is_online == False).count()
        total_in_queue = online_count + walkin_count
        next_category = QueueBalancer.get_next_category(online_count, walkin_count)
        arrival_rate_lambda = 12.0 + (total_in_queue / 5.0) 
        service_rate_mu = 5.0
        num_servers_k = 4
        mmk_results = QueueBalancer.calculate_mmk_metrics(arrival_rate_lambda, service_rate_mu, num_servers_k)
        expected_wait_mins = mmk_results["expected_wait_mins"]
        return {
            "online_queue": online_count,
            "walkin_queue": walkin_count,
            "next_category": next_category,
            "mmk_metrics": {
                "arrival_rate_lambda": round(arrival_rate_lambda, 2),
                "service_rate_mu": service_rate_mu,
                "counters_k": num_servers_k,
                "expected_wait_mins": expected_wait_mins if expected_wait_mins != float('inf') else "Infinite (Overcapacity)",
                "expected_queue_length": mmk_results["expected_queue_length"] if mmk_results["expected_queue_length"] != float('inf') else "Infinite",
                "utilization_pct": mmk_results["utilization"]
            },
            "cv_alerts": {
                "detected_crowd": "Waiting for CV feed...",
                "expected_devotees": "...",
                "status": "INITIALIZING"
            }
        }

    @app.post("/queue/call-next")
    def call_next_token(db: Session = Depends(get_db)):
        online_count = db.query(models.Booking).filter(models.Booking.status == "IN_QUEUE", models.Booking.is_online == True).count()
        walkin_count = db.query(models.Booking).filter(models.Booking.status == "IN_QUEUE", models.Booking.is_online == False).count()
        category = QueueBalancer.get_next_category(online_count, walkin_count)
        if not category:
            return {"message": "No devotees in queue", "called_token": None}
        is_online_target = True if "ONLINE" in category else False
        if "BALANCED" in category:
            next_booking = db.query(models.Booking).filter(models.Booking.status == "IN_QUEUE").order_by(models.Booking.booking_time.asc()).first()
        else:
            next_booking = db.query(models.Booking).filter(
                models.Booking.status == "IN_QUEUE", 
                models.Booking.is_online == is_online_target
            ).order_by(models.Booking.booking_time.asc()).first()
        if not next_booking:
            next_booking = db.query(models.Booking).filter(models.Booking.status == "IN_QUEUE").order_by(models.Booking.booking_time.asc()).first()
        if next_booking:
            next_booking.status = "SERVED"
            db.commit()
            db.refresh(next_booking)
            return {
                "message": f"Successfully called next token from {category}",
                "called_token": next_booking.token_number,
                "is_online": next_booking.is_online
            }
        return {"message": "No devotees in queue", "called_token": None}

except Exception as e:
    error_msg = traceback.format_exc()
    @app.get("/{path:path}")
    def catch_all(path: str):
        return {"error": "Failed to initialize server", "traceback": error_msg}

