import sys
import os
import bcrypt
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import engine, SessionLocal
import models
from supabase import create_client

url = "https://dbelmiceyijuogyuhlvb.supabase.co"
key = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")).read().split("SUPABASE_ANON_KEY=")[1].split()[0]
client = create_client(url, key)

def setup_temple_admin(email, pwd, name, temple_id):
    db = SessionLocal()
    # Try sign up via Supabase Auth
    try:
        client.auth.sign_up({"email": email, "password": pwd, "options": {"data": {"name": name, "role": "admin"}}})
        print(f"Signed up {email}")
    except Exception as e:
        print(f"Signup note for {email}: {e}")
    
    # Ensure confirmed and password set in auth.users
    hashed = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE auth.users SET email_confirmed_at = NOW(), encrypted_password = :h WHERE email = :e"),
            {"h": hashed, "e": email}
        )
        conn.commit()

    # Ensure in models.User table
    u = db.query(models.User).filter(models.User.email == email).first()
    if not u:
        u = models.User(email=email, name=name, hashed_password="managed_by_supabase", is_admin=True)
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        u.is_admin = True
        u.name = name
        db.commit()

    # Link specific temple
    temple = db.query(models.Temple).filter(models.Temple.id == temple_id).first()
    if temple:
        temple.admin_id = u.id
        db.commit()
        print(f"Linked {temple.name} (ID: {temple_id}) to Admin {email} (User ID: {u.id})")
    
    # Verify login
    try:
        login_res = client.auth.sign_in_with_password({"email": email, "password": pwd})
        print(f"Login verified for {email} -> Token generated successfully.")
    except Exception as e:
        print(f"Login verification failed for {email}: {e}")
        
    db.close()

if __name__ == "__main__":
    print("Setting up Temple Specific Admins...")
    # 1. Kashi Vishwanath
    setup_temple_admin("kashi.admin@smarttemple.com", "Admin@123", "Kashi Vishwanath Admin", 1)
    # 2. Siddhivinayak Temple
    setup_temple_admin("siddhi.admin@smarttemple.com", "Admin@123", "Siddhivinayak Admin", 5)
    # 3. Mata Vaishno Devi
    setup_temple_admin("vaishno.admin@smarttemple.com", "Admin@123", "Vaishno Devi Admin", 3)
    # 4. Tirumala Venkateswara
    setup_temple_admin("tirupati.admin@smarttemple.com", "Admin@123", "Tirupati Admin", 2)
    # 5. Mahakaleshwar
    setup_temple_admin("mahakal.admin@smarttemple.com", "Admin@123", "Mahakaleshwar Admin", 12)
    print("Done!")
