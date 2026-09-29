import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed_data():
    print("Starting data seeding...", flush=True)
    db = SessionLocal()
    
    temple_data = [
        {"name": "Shri Kashi Vishwanath", "city": "Varanasi"},
        {"name": "Tirumala Venkateswara Temple", "city": "Tirupati"},
        {"name": "Mata Vaishno Devi", "city": "Katra"},
        {"name": "Siddhivinayak Temple", "city": "Mumbai"},
        {"name": "Meenakshi Amman Temple", "city": "Madurai"},
        {"name": "Jagannath Temple", "city": "Puri"},
        {"name": "Somnath Temple", "city": "Prabhas Patan"},
        {"name": "Kedarnath Temple", "city": "Kedarnath"},
        {"name": "Badrinath Temple", "city": "Badrinath"},
        {"name": "Golden Temple", "city": "Amritsar"},
        {"name": "Mahakaleshwar Jyotirlinga", "city": "Ujjain"},
        {"name": "Kamakhya Temple", "city": "Guwahati"},
        {"name": "Ramanathaswamy Temple", "city": "Rameswaram"},
        {"name": "Shirdi Sai Baba Sansthan", "city": "Shirdi"},
        {"name": "Padmanabhaswamy Temple", "city": "Thiruvananthapuram"},
        {"name": "Akshardham Temple", "city": "New Delhi"},
        {"name": "Banke Bihari Temple", "city": "Vrindavan"},
        {"name": "Prem Mandir", "city": "Vrindavan"},
        {"name": "Lingaraj Temple", "city": "Bhubaneswar"},
        {"name": "Dakshineswar Kali Temple", "city": "Kolkata"},
        {"name": "Shree Dwarkadhish Temple", "city": "Dwarka"}
    ]
    
    # 1. Seed Temples
    print("Seeding Temples...", flush=True)
    existing_temples = {t.name: t for t in db.query(models.Temple).all()}
    
    new_temples = []
    for t_data in temple_data:
        if t_data["name"] not in existing_temples:
            t = models.Temple(name=t_data["name"], city=t_data["city"])
            db.add(t)
            new_temples.append(t)
            existing_temples[t_data["name"]] = t
            
    db.commit()
    print(f"Added {len(new_temples)} new temples.", flush=True)
    
    all_temples = db.query(models.Temple).all()
    
    print("Fetching existing slots to avoid duplicates...", flush=True)
    # Get all distinct (temple_id, date) pairs that already have slots
    existing_slots = db.query(models.TimeSlot.temple_id, models.TimeSlot.date).distinct().all()
    existing_set = set((t_id, d) for t_id, d in existing_slots)
    
    print("Seeding TimeSlots for all temples...", flush=True)
    today = datetime.datetime.now().date()
    
    slots_to_add = []
    
    for temple in all_temples:
        for day_offset in range(30):  # Today + 30 days
            current_date = today + datetime.timedelta(days=day_offset)
            
            if (temple.id, current_date) in existing_set:
                continue
                
            for hour in range(6, 21): # 6 AM to 8 PM
                start_time = datetime.time(hour, 0)
                end_time = datetime.time(hour+1, 0) if hour < 23 else datetime.time(23, 59)
                
                # Base capacity (some variance)
                cap = 50
                if hour >= 10 and hour <= 14: cap = 70 # Peak hours
                if hour >= 18: cap = 60 # Evening aarti
                
                slots_to_add.append(
                    models.TimeSlot(
                        temple_id=temple.id,
                        date=current_date,
                        start_time=start_time,
                        end_time=end_time,
                        max_capacity=cap
                    )
                )

    if slots_to_add:
        print(f"Adding {len(slots_to_add)} time slots...", flush=True)
        chunk_size = 2000
        for i in range(0, len(slots_to_add), chunk_size):
            print(f"Saving chunk {i} to {i+chunk_size}...", flush=True)
            db.bulk_save_objects(slots_to_add[i:i+chunk_size])
            db.commit()
        print("Slots added successfully.", flush=True)
    else:
        print("No new slots needed.", flush=True)

    db.close()
    print("Seeding complete!", flush=True)

if __name__ == "__main__":
    seed_data()
