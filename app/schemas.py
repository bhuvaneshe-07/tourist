from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    email: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HotelIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    location: str = Field(min_length=2, max_length=160)
    description: str = ""


class HotelOut(BaseModel):
    id: int
    name: str
    location: str
    description: str

    model_config = ConfigDict(from_attributes=True)


class PackageIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    destination: str = Field(min_length=2, max_length=160)
    hotel_id: int
    price: float = Field(gt=0)
    available_date: date
    image_url: str = ""
    description: str = ""


class PriceUpdate(BaseModel):
    price: float = Field(gt=0)


class PackageOut(BaseModel):
    id: int
    name: str
    destination: str
    hotel_id: int
    hotel_name: str
    price: float
    available_date: date
    image_url: str
    description: str

    model_config = ConfigDict(from_attributes=True)


class BookingCreate(BaseModel):
    package_id: int
    payment_method: str = Field(min_length=3, max_length=40)
    account_number: str = Field(min_length=8, max_length=24)


class BookingOut(BaseModel):
    id: int
    package_id: int
    package_name: str
    destination: str
    hotel_name: str
    travel_date: date
    amount: float
    status: str
    tourist_email: str
    created_at: datetime
    payment_status: Optional[str] = None
    payment_reference: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    booking_id: int
    tourist_email: str
    amount: float
    method: str
    status: str
    reference: str
    created_at: datetime


class NotificationOut(BaseModel):
    id: int
    ntype: str
    subject: str
    message: str
    delivered: int
    created_at: datetime


class DashboardOut(BaseModel):
    packages: int
    hotels: int
    active_bookings: int
    cancelled_bookings: int
    tourists: int
    payments_total: float
    successful_payments: int
    failed_payments: int
