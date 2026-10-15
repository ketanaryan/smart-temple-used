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



    import os
    from supabase import create_client, Client
    from dotenv import load_dotenv
    
    load_dotenv()
    
    supabase_url = os.environ.get("SUPABASE_URL", "https://dbelmiceyijuogyuhlvb.supabase.co")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", "")
    supabase_client: Client = create_client(supabase_url, supabase_key) if supabase_key else None

    def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        if not supabase_client:
            print("Supabase client not initialized. Check SUPABASE_ANON_KEY environment variable.")
            raise credentials_exception
            
        try:
            # We use Supabase Auth API to verify token and get the user
            user_res = supabase_client.auth.get_user(token)
            if not user_res or not user_res.user:
                raise credentials_exception
            email = user_res.user.email
            name = user_res.user.user_metadata.get('name', 'Supabase User') if user_res.user.user_metadata else 'Supabase User'
        except Exception as e:
            print(f"Token verification error: {e}")
            raise credentials_exception
            
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            # Auto-create user in our DB if they registered via Supabase and don't exist yet
            user = models.User(email=email, name=name, hashed_password="managed_by_supabase")
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user



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
        managed_temples = []
        if current_user.is_admin:
            m_temples = db.query(models.Temple).filter(models.Temple.admin_id == current_user.id).all()
            managed_temples = [{"id": t.id, "name": t.name, "city": t.city} for t in m_temples]

        return {
            "user": {
                "name": current_user.name,
                "email": current_user.email,
                "is_admin": current_user.is_admin,
                "managed_temples": managed_temples
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
        
        # Check if slot date or time has already passed
        today = datetime.now().date()
        current_time = datetime.now().time()
        if slot.date < today or (slot.date == today and slot.end_time < current_time):
            raise HTTPException(status_code=400, detail="This slot time has already passed. Please select an upcoming slot.")

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
    def get_queue_status(temple_id: int = 1, db: Session = Depends(get_db)):
        online_count = db.query(models.Booking).join(models.TimeSlot).filter(
            models.TimeSlot.temple_id == temple_id, 
            models.Booking.status == "IN_QUEUE", 
            models.Booking.is_online == True
        ).count()
        walkin_count = db.query(models.Booking).join(models.TimeSlot).filter(
            models.TimeSlot.temple_id == temple_id, 
            models.Booking.status == "IN_QUEUE", 
            models.Booking.is_online == False
        ).count()
        
        total_in_queue = online_count + walkin_count
        next_category = QueueBalancer.get_next_category(online_count, walkin_count)
        arrival_rate_lambda = 12.0 + (total_in_queue / 5.0) 
        service_rate_mu = 5.0
        num_servers_k = 4
        mmk_results = QueueBalancer.calculate_mmk_metrics(arrival_rate_lambda, service_rate_mu, num_servers_k)
        expected_wait_mins = mmk_results["expected_wait_mins"]

        # Feature: Predictive Crowd Risk & Intelligent Crowd Flow Controller
        predicted_queue = max(0, total_in_queue + (arrival_rate_lambda * 30) - (service_rate_mu * num_servers_k * 30))
        if predicted_queue > 80:
            risk_level = "CRITICAL"
            prediction_text = f"High congestion predicted in 30 minutes. Est. queue: {int(predicted_queue)} people."
            recommended_action = "IMMEDIATE: Halt walk-in tokens. Open overflow holding area. Prioritize pre-booked devotees."
        elif predicted_queue > 30:
            risk_level = "WARNING"
            prediction_text = f"Moderate congestion predicted in 30 minutes. Est. queue: {int(predicted_queue)} people."
            recommended_action = "Reduce walk-in token issuance by 30%. Monitor Zone A."
        else:
            risk_level = "NORMAL"
            prediction_text = "Steady crowd flow expected over the next 30 minutes."
            recommended_action = "Maintain current operations. Open all standard gates."
            
        # Feature: Dynamic Time-Slot Capacity Auto-Adjust
        import datetime
        current_time = datetime.datetime.now().time()
        today = datetime.datetime.now().date()
        upcoming_slots = db.query(models.TimeSlot).filter(
            models.TimeSlot.temple_id == temple_id,
            models.TimeSlot.date == today,
            models.TimeSlot.start_time >= current_time
        ).all()
        
        # Dynamically set capacities to prevent future crowding
        for slot in upcoming_slots:
            if risk_level == "CRITICAL": slot.max_capacity = 25
            elif risk_level == "WARNING": slot.max_capacity = 40
            elif risk_level == "NORMAL": slot.max_capacity = 60
        db.commit()

        env_data = {
            1: {"temp": "28.5AC", "aqi": 112, "aqi_status": "MODERATE", "cap": "76%", "sec": "SECURE"},
            2: {"temp": "22.1AC", "aqi": 42, "aqi_status": "GOOD", "cap": "92%", "sec": "ELEVATED"},
            3: {"temp": "12.0AC", "aqi": 28, "aqi_status": "EXCELLENT", "cap": "45%", "sec": "SECURE"},
        }
        mock_env = env_data.get(temple_id, env_data[1])

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
            "ai_predictions": {
                "risk_level": risk_level,
                "prediction_text": prediction_text,
                "recommended_action": recommended_action,
                "slots_auto_adjusted": len(upcoming_slots)
            },
            "environment": mock_env,

            "cv_alerts": {
                "detected_crowd": "Waiting for CV feed...",
                "expected_devotees": "...",
                "status": "INITIALIZING"
            }
        }

    @app.post("/queue/call-next")
    def call_next_token(temple_id: int = 1, db: Session = Depends(get_db)):
        base_query = db.query(models.Booking).join(models.TimeSlot).filter(
            models.TimeSlot.temple_id == temple_id,
            models.Booking.status == "IN_QUEUE"
        )
        online_count = base_query.filter(models.Booking.is_online == True).count()
        walkin_count = base_query.filter(models.Booking.is_online == False).count()
        
        category = QueueBalancer.get_next_category(online_count, walkin_count)
        if not category:
            return {"message": "No devotees in queue", "called_token": None}
            
        is_online_target = True if "ONLINE" in category else False
        if "BALANCED" in category:
            next_booking = base_query.order_by(models.Booking.booking_time.asc()).first()
        else:
            next_booking = base_query.filter(models.Booking.is_online == is_online_target).order_by(models.Booking.booking_time.asc()).first()
            
        if not next_booking:
            next_booking = base_query.order_by(models.Booking.booking_time.asc()).first()
            
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


@app.post('/admin/generate-code')
def generate_temple_code(code_data: schemas.TempleCodeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.email != 'mainadmin@smarttemple.com':
        raise HTTPException(status_code=403, detail='Only Main Admin can generate codes')
    import string, random
    temple = db.query(models.Temple).filter(models.Temple.id == code_data.temple_id).first()
    if not temple:
        raise HTTPException(status_code=404, detail='Temple not found')
    prefix = (temple.city[:3] if temple.city else 'TPL').upper()
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    code_str = f"{prefix}-{random_str}"
    db_code = models.TempleCode(code=code_str, created_by=current_user.id, temple_id=temple.id)
    db.add(db_code)
    try:
        db.commit()
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail='Code already exists')
    return {"code": code_str, "temple_id": temple.id}


@app.post('/admin/register-temple')
def register_temple_admin(data: schemas.TempleAdminRegister, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    code = db.query(models.TempleCode).filter(models.TempleCode.code == data.temple_code, models.TempleCode.is_used == False).first()
    if not code:
        raise HTTPException(status_code=400, detail='Invalid or already used Temple Code')
    
    code.is_used = True
    
    if code.temple_id:
        temple = db.query(models.Temple).filter(models.Temple.id == code.temple_id).first()
        if temple:
            temple.admin_id = current_user.id
            if data.temple_name: temple.name = data.temple_name
            if data.city: temple.city = data.city
    else:
        new_temple = models.Temple(name=data.temple_name, city=data.city, admin_id=current_user.id)
        db.add(new_temple)
        
    current_user.is_admin = True
    db.commit()
    return {'message': 'Temple Admin registered successfully'}



@app.get('/users/me', response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.get('/ticket/{token_number}')
def get_ticket(token_number: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_number == token_number).first()
    if not booking:
        raise HTTPException(status_code=404, detail='Ticket not found')
    slot = db.query(models.TimeSlot).filter(models.TimeSlot.id == booking.slot_id).first()
    temple = db.query(models.Temple).filter(models.Temple.id == slot.temple_id).first()
    user = db.query(models.User).filter(models.User.id == booking.user_id).first() if booking.user_id else None
    return {
        'token': booking.token_number,
        'status': booking.status,
        'temple_name': temple.name,
        'city': temple.city,
        'date': slot.date,
        'start_time': slot.start_time,
        'end_time': slot.end_time,
        'booking_time': booking.booking_time,
        'user_name': user.name if user else 'Walk-in Devotee'
    }

@app.get('/admin/codes', response_model=List[schemas.TempleCodeResponse])
def get_temple_codes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.email != 'mainadmin@smarttemple.com':
        raise HTTPException(status_code=403, detail='Only Main Admin can view codes')
    codes = db.query(models.TempleCode).order_by(models.TempleCode.id.desc()).all()
    results = []
    for c in codes:
        t = db.query(models.Temple).filter(models.Temple.id == c.temple_id).first() if c.temple_id else None
        results.append({
            "code": c.code,
            "is_used": c.is_used,
            "temple_id": c.temple_id,
            "temple_name": t.name if t else None
        })
    return results

@app.get('/admin/temples/{temple_id}/bookings')
def get_temple_bookings(temple_id: int, db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).join(models.TimeSlot).filter(
        models.TimeSlot.temple_id == temple_id
    ).order_by(models.Booking.booking_time.desc()).limit(50).all()
    
    results = []
    for b in bookings:
        slot = db.query(models.TimeSlot).filter(models.TimeSlot.id == b.slot_id).first()
        results.append({
            'id': b.id,
            'token_number': b.token_number,
            'status': b.status,
            'is_online': b.is_online,
            'date': str(slot.date) if slot else '',
            'start_time': str(slot.start_time) if slot else ''
        })
    return results


# --- DYNAMIC SERVICES IN-MEMORY DB ---
# For hackathon demo purposes, these are kept in-memory
global_sos_alerts = []
global_parking = {"total": 500, "booked": 320}
global_donations = []
global_lost_found = [
    {"id": 1, "type": "child", "desc": "Boy, 5 yrs, red shirt", "status": "searching"},
    {"id": 2, "type": "item", "desc": "Black wallet", "status": "found"}
]

from pydantic import BaseModel
class SOSRequest(BaseModel):
    user_name: str
    location: str

class DonationRequest(BaseModel):
    user_name: str
    amount: int

class LostFoundRequest(BaseModel):
    item_type: str
    desc: str

@app.post("/services/sos")
def trigger_sos(req: SOSRequest):
    global_sos_alerts.append(req.dict())
    return {"message": "SOS Alert Sent to Security"}

@app.get("/services/sos")
def get_sos():
    return global_sos_alerts

@app.get("/services/parking")
def get_parking():
    return global_parking

@app.post("/services/parking/book")
def book_parking():
    if global_parking["booked"] < global_parking["total"]:
        global_parking["booked"] += 1
        return {"success": True, "booked": global_parking["booked"]}
    raise HTTPException(status_code=400, detail="Parking Full")

@app.post("/services/donate")
def make_donation(req: DonationRequest):
    global_donations.append(req.dict())
    return {"message": "Donation successful"}

@app.get("/services/lostfound")
def get_lostfound():
    return global_lost_found

@app.post("/services/lostfound")
def report_lostfound(req: LostFoundRequest):
    new_item = {"id": len(global_lost_found) + 1, "type": req.item_type, "desc": req.desc, "status": "searching"}
    global_lost_found.insert(0, new_item)
    return new_item
# ------------------------------------

