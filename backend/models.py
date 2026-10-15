from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Date, Time
from sqlalchemy.orm import relationship
import datetime

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)

    bookings = relationship("Booking", back_populates="user")


class Temple(Base):
    __tablename__ = "temples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    city = Column(String, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    upi_id = Column(String, nullable=True)
    trust_name = Column(String, nullable=True)
    qr_image = Column(String, nullable=True)

    slots = relationship("TimeSlot", back_populates="temple")
    admin = relationship("User", foreign_keys=[admin_id])

class TempleCode(Base):
    __tablename__ = "temple_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    is_used = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    temple_id = Column(Integer, ForeignKey("temples.id"), nullable=True)

    temple = relationship("Temple")


class TimeSlot(Base):
    __tablename__ = "time_slots"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(Integer, ForeignKey("temples.id"))
    date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    max_capacity = Column(Integer, default=50)

    temple = relationship("Temple", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot")

    @property
    def booked_count(self):
        return len(self.bookings)

    @property
    def availability(self):
        return self.max_capacity - self.booked_count


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    slot_id = Column(Integer, ForeignKey("time_slots.id"))
    booking_time = Column(DateTime, default=datetime.datetime.utcnow)
    token_number = Column(String, unique=True, index=True)
    status = Column(String, default="BOOKED") # BOOKED, IN_QUEUE, SERVED, CANCELLED
    is_online = Column(Boolean, default=True) # True for online booking, False for walk-in

    user = relationship("User", back_populates="bookings")
    slot = relationship("TimeSlot", back_populates="bookings")
