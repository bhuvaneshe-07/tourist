"""Tourist Management System — FastAPI application."""

from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    require_tourist,
    verify_password,
)
from app.database import Base, SessionLocal, engine, get_db
from app.models import Booking, Hotel, Notification, Package, Payment, User
from app.notifications import process_trip_reminders, send_notification
from app.schemas import (
    BookingCreate,
    BookingOut,
    DashboardOut,
    HotelIn,
    HotelOut,
    LoginRequest,
    NotificationOut,
    PackageIn,
    PackageOut,
    PaymentOut,
    PriceUpdate,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.seed import seed_if_empty

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
        process_trip_reminders(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Tourist Management System", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
init_db()


def package_to_out(pkg: Package) -> PackageOut:
    return PackageOut(
        id=pkg.id,
        name=pkg.name,
        destination=pkg.destination,
        hotel_id=pkg.hotel_id,
        hotel_name=pkg.hotel.name if pkg.hotel else "",
        price=pkg.price,
        available_date=pkg.available_date,
        image_url=pkg.image_url,
        description=pkg.description or "",
    )


def booking_to_out(booking: Booking) -> BookingOut:
    pkg = booking.package
    pay = booking.payment
    return BookingOut(
        id=booking.id,
        package_id=booking.package_id,
        package_name=pkg.name if pkg else "",
        destination=pkg.destination if pkg else "",
        hotel_name=pkg.hotel.name if pkg and pkg.hotel else "",
        travel_date=booking.travel_date,
        amount=booking.amount,
        status=booking.status,
        tourist_email=booking.tourist.email if booking.tourist else "",
        created_at=booking.created_at,
        payment_status=pay.status if pay else None,
        payment_reference=pay.reference if pay else None,
    )


def simulate_payment(account_number: str) -> tuple[str, str]:
    digits = "".join(ch for ch in account_number if ch.isdigit())
    if len(digits) < 12 or digits.startswith("0000"):
        return "failed", f"FAIL-{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S')}"
    ref = f"PAY-{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S')}"
    return "success", ref


@app.post("/api/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="tourist",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user),
        role=user.role,
        name=user.name,
        email=user.email,
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return TokenResponse(
        access_token=create_access_token(user),
        role=user.role,
        name=user.name,
        email=user.email,
    )


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@app.get("/api/packages", response_model=list[PackageOut])
def search_packages(destination: str = "", travel_date: date | None = None, db: Session = Depends(get_db)):
    query = db.query(Package).options(joinedload(Package.hotel))
    if destination.strip():
        query = query.filter(Package.destination.ilike(f"%{destination.strip()}%"))
    if travel_date:
        query = query.filter(Package.available_date == travel_date)
    return [package_to_out(p) for p in query.order_by(Package.available_date).all()]


@app.get("/api/packages/{package_id}", response_model=PackageOut)
def get_package(package_id: int, db: Session = Depends(get_db)):
    pkg = db.query(Package).options(joinedload(Package.hotel)).filter(Package.id == package_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found.")
    return package_to_out(pkg)


@app.post("/api/bookings", response_model=BookingOut)
def create_booking(payload: BookingCreate, user: User = Depends(require_tourist), db: Session = Depends(get_db)):
    pkg = db.query(Package).options(joinedload(Package.hotel)).filter(Package.id == payload.package_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found.")
    
    if pkg.available_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book a package for a past date.")

    method = payload.payment_method.strip()
    if method not in {"card", "netbanking"}:
        raise HTTPException(status_code=400, detail="Choose a valid payment method.")

    status_pay, reference = simulate_payment(payload.account_number)

    booking = Booking(
        tourist_id=user.id,
        package_id=pkg.id,
        travel_date=pkg.available_date,
        amount=pkg.price,
        status="confirmed" if status_pay == "success" else "failed",
    )
    db.add(booking)
    db.flush()

    payment = Payment(
        booking_id=booking.id,
        amount=pkg.price,
        method=method,
        status=status_pay,
        reference=reference,
    )
    db.add(payment)
    db.flush()

    if status_pay != "success":
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Payment failed. Use a valid account/card number (12+ digits). Numbers starting with 0000 are declined.",
        )

    send_notification(
        db,
        user.id,
        "confirmation",
        "Booking confirmation",
        f"Booking BK-{booking.id} confirmed for {pkg.name} ({pkg.destination}) on {pkg.available_date}.",
        booking_id=booking.id,
    )
    send_notification(
        db,
        user.id,
        "receipt",
        "Payment receipt",
        f"Receipt {reference}: payment of ${pkg.price:.2f} received for booking BK-{booking.id}.",
        booking_id=booking.id,
    )
    db.commit()
    db.refresh(booking)
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.package).joinedload(Package.hotel), joinedload(Booking.tourist), joinedload(Booking.payment))
        .filter(Booking.id == booking.id)
        .first()
    )
    process_trip_reminders(db, tourist=user)
    return booking_to_out(booking)


@app.get("/api/bookings/me", response_model=list[BookingOut])
def my_bookings(user: User = Depends(require_tourist), db: Session = Depends(get_db)):
    rows = (
        db.query(Booking)
        .options(joinedload(Booking.package).joinedload(Package.hotel), joinedload(Booking.tourist), joinedload(Booking.payment))
        .filter(Booking.tourist_id == user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [booking_to_out(b) for b in rows]


@app.post("/api/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.package).joinedload(Package.hotel), joinedload(Booking.tourist), joinedload(Booking.payment))
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if user.role == "tourist" and booking.tourist_id != user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own bookings.")
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="This booking is already cancelled.")

    booking.status = "cancelled"
    send_notification(
        db,
        booking.tourist_id,
        "confirmation",
        "Booking cancelled",
        f"Booking BK-{booking.id} has been cancelled.",
    )
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@app.get("/api/bookings/{booking_id}/ticket")
def download_ticket(booking_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.package).joinedload(Package.hotel), joinedload(Booking.tourist), joinedload(Booking.payment))
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if user.role == "tourist" and booking.tourist_id != user.id:
        raise HTTPException(status_code=403, detail="You can only download your own tickets.")
    if booking.status != "confirmed":
        raise HTTPException(status_code=400, detail="Tickets are available only for confirmed bookings.")

    pkg = booking.package
    pay = booking.payment
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket BK-{booking.id}</title>
<style>
body {{ font-family: Segoe UI, Arial, sans-serif; padding: 32px; color: #0f172a; }}
.ticket {{ border: 2px dashed #0f766e; border-radius: 16px; padding: 28px; max-width: 640px; }}
h1 {{ margin: 0 0 8px; color: #0f766e; }}
p {{ margin: 6px 0; }}
</style></head><body>
<div class="ticket">
<h1>TourManager Ticket</h1>
<p><strong>Booking:</strong> BK-{booking.id}</p>
<p><strong>Traveler:</strong> {booking.tourist.name} ({booking.tourist.email})</p>
<p><strong>Package:</strong> {pkg.name}</p>
<p><strong>Destination:</strong> {pkg.destination}</p>
<p><strong>Hotel:</strong> {pkg.hotel.name if pkg.hotel else "-"}</p>
<p><strong>Travel date:</strong> {booking.travel_date}</p>
<p><strong>Amount paid:</strong> ${booking.amount:.2f}</p>
<p><strong>Payment:</strong> {pay.reference if pay else "-"} ({pay.status if pay else "-"})</p>
<p><strong>Status:</strong> {booking.status}</p>
</div>
</body></html>"""
    return Response(
        content=html,
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="ticket-BK-{booking.id}.html"'},
    )


@app.get("/api/notifications", response_model=list[NotificationOut])
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    process_trip_reminders(db, tourist=user if user.role == "tourist" else None)
    query = db.query(Notification).order_by(Notification.created_at.desc())
    if user.role == "tourist":
        query = query.filter(Notification.tourist_id == user.id)
    return query.all()


@app.get("/api/admin/dashboard", response_model=DashboardOut)
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    packages = db.query(func.count(Package.id)).scalar() or 0
    hotels = db.query(func.count(Hotel.id)).scalar() or 0
    active = db.query(func.count(Booking.id)).filter(Booking.status == "confirmed").scalar() or 0
    cancelled = db.query(func.count(Booking.id)).filter(Booking.status == "cancelled").scalar() or 0
    tourists = db.query(func.count(User.id)).filter(User.role == "tourist").scalar() or 0
    pay_q = db.query(Payment)
    if user.role != "admin":
        tourist_bookings = db.query(Booking.id).filter(Booking.tourist_id == user.id)
        pay_q = pay_q.filter(Payment.booking_id.in_(tourist_bookings))
        active = db.query(func.count(Booking.id)).filter(Booking.tourist_id == user.id, Booking.status == "confirmed").scalar() or 0
        cancelled = db.query(func.count(Booking.id)).filter(Booking.tourist_id == user.id, Booking.status == "cancelled").scalar() or 0
        tourists = 1
    successful = pay_q.filter(Payment.status == "success").count()
    failed = pay_q.filter(Payment.status == "failed").count()
    total = pay_q.filter(Payment.status == "success").with_entities(func.coalesce(func.sum(Payment.amount), 0.0)).scalar() or 0
    return DashboardOut(
        packages=packages,
        hotels=hotels,
        active_bookings=active,
        cancelled_bookings=cancelled,
        tourists=tourists,
        payments_total=float(total),
        successful_payments=successful,
        failed_payments=failed,
    )


@app.get("/api/admin/hotels", response_model=list[HotelOut])
def list_hotels(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Hotel).order_by(Hotel.name).all()


@app.post("/api/admin/hotels", response_model=HotelOut)
def create_hotel(payload: HotelIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    hotel = Hotel(**payload.model_dump())
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return hotel


@app.put("/api/admin/hotels/{hotel_id}", response_model=HotelOut)
def update_hotel(hotel_id: int, payload: HotelIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    hotel = db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found.")
    for key, value in payload.model_dump().items():
        setattr(hotel, key, value)
    db.commit()
    db.refresh(hotel)
    return hotel


@app.delete("/api/admin/hotels/{hotel_id}")
def delete_hotel(hotel_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    hotel = db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found.")
    linked = db.query(Package).filter(Package.hotel_id == hotel_id).count()
    if linked:
        raise HTTPException(status_code=400, detail="Cannot delete a hotel that is assigned to packages.")
    db.delete(hotel)
    db.commit()
    return {"ok": True}


@app.post("/api/admin/packages", response_model=PackageOut)
def create_package(payload: PackageIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if not db.get(Hotel, payload.hotel_id):
        raise HTTPException(status_code=400, detail="Select a valid hotel.")
    if payload.available_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot create a package for a past date.")
    pkg = Package(**payload.model_dump())
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    pkg = db.query(Package).options(joinedload(Package.hotel)).filter(Package.id == pkg.id).first()
    return package_to_out(pkg)


@app.put("/api/admin/packages/{package_id}", response_model=PackageOut)
def update_package(package_id: int, payload: PackageIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    pkg = db.get(Package, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found.")
    if not db.get(Hotel, payload.hotel_id):
        raise HTTPException(status_code=400, detail="Select a valid hotel.")
    if payload.available_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot update a package to a past date.")
    for key, value in payload.model_dump().items():
        setattr(pkg, key, value)
    db.commit()
    pkg = db.query(Package).options(joinedload(Package.hotel)).filter(Package.id == pkg.id).first()
    return package_to_out(pkg)


@app.put("/api/admin/packages/{package_id}/price", response_model=PackageOut)
def update_price(package_id: int, payload: PriceUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    pkg = db.get(Package, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found.")
    pkg.price = payload.price
    db.commit()
    pkg = db.query(Package).options(joinedload(Package.hotel)).filter(Package.id == pkg.id).first()
    return package_to_out(pkg)


@app.delete("/api/admin/packages/{package_id}")
def delete_package(package_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    pkg = db.get(Package, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found.")
    linked = db.query(Booking).filter(Booking.package_id == package_id).count()
    if linked:
        raise HTTPException(status_code=400, detail="Cannot delete a package that has bookings.")
    db.delete(pkg)
    db.commit()
    return {"ok": True}


@app.get("/api/admin/bookings", response_model=list[BookingOut])
def all_bookings(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = (
        db.query(Booking)
        .options(joinedload(Booking.package).joinedload(Package.hotel), joinedload(Booking.tourist), joinedload(Booking.payment))
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [booking_to_out(b) for b in rows]


@app.get("/api/admin/tourists", response_model=list[UserOut])
def all_tourists(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return db.query(User).filter(User.role == "tourist").order_by(User.created_at.desc()).all()


@app.get("/api/admin/payments", response_model=list[PaymentOut])
def all_payments(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = db.query(Payment).options(joinedload(Payment.booking).joinedload(Booking.tourist)).order_by(Payment.created_at.desc()).all()
    out = []
    for p in rows:
        email = p.booking.tourist.email if p.booking and p.booking.tourist else ""
        out.append(
            PaymentOut(
                id=p.id,
                booking_id=p.booking_id,
                tourist_email=email,
                amount=p.amount,
                method=p.method,
                status=p.status,
                reference=p.reference,
                created_at=p.created_at,
            )
        )
    return out


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")
