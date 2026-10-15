from pydantic import BaseModel
from typing import List, Optional
import datetime

class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class TempleBase(BaseModel):
    name: str
    city: str
    upi_id: Optional[str] = None
    trust_name: Optional[str] = None
    qr_image: Optional[str] = None

class TempleCreate(TempleBase):
    pass

class TempleDonationSettingsUpdate(BaseModel):
    upi_id: Optional[str] = None
    trust_name: Optional[str] = None
    qr_image: Optional[str] = None

class Temple(TempleBase):
    id: int
    admin_id: Optional[int] = None

    class Config:
        from_attributes = True

class TimeSlotBase(BaseModel):
    date: datetime.date
    start_time: datetime.time
    end_time: datetime.time
    max_capacity: int

class TimeSlotCreate(TimeSlotBase):
    temple_id: int

class TimeSlot(TimeSlotBase):
    id: int
    temple_id: int
    booked_count: int
    availability: int

    class Config:
        from_attributes = True

class BookingBase(BaseModel):
    slot_id: int
    is_online: bool = True

class BookingCreate(BookingBase):
    pass

class Booking(BookingBase):
    id: int
    user_id: Optional[int] = None
    token_number: str
    status: str
    booking_time: datetime.datetime

    class Config:
        from_attributes = True

class TempleAdminRegister(BaseModel):
    name: str
    city: str
    temple_name: str
    temple_code: str

class TempleCodeCreate(BaseModel):
    temple_id: int

class TempleCodeResponse(BaseModel):
    code: str
    is_used: bool
    temple_id: Optional[int] = None
    temple_name: Optional[str] = None

    class Config:
        from_attributes = True
