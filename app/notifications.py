from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import Booking, Notification, User


def send_notification(db: Session, tourist_id: int, ntype: str, subject: str, message: str, booking_id: int | None = None) -> Notification:
    note = Notification(
        tourist_id=tourist_id,
        booking_id=booking_id,
        ntype=ntype,
        subject=subject,
        message=message,
        delivered=1,
    )
    db.add(note)
    db.flush()
    return note


def process_trip_reminders(db: Session, tourist: User | None = None, days: int = 7) -> int:
    today = date.today()
    cutoff = today + timedelta(days=days)
    query = (
        db.query(Booking)
        .filter(Booking.status == "confirmed")
        .filter(Booking.travel_date >= today)
        .filter(Booking.travel_date <= cutoff)
    )
    if tourist and tourist.role == "tourist":
        query = query.filter(Booking.tourist_id == tourist.id)

    created = 0
    for booking in query.all():
        exists = (
            db.query(Notification)
            .filter(Notification.tourist_id == booking.tourist_id)
            .filter(Notification.ntype == "reminder")
            .filter(Notification.booking_id == booking.id)
            .first()
        )
        if exists:
            continue
        pkg = booking.package
        send_notification(
            db,
            booking.tourist_id,
            "reminder",
            "Trip reminder",
            f"Reminder: booking BK-{booking.id} ({pkg.name} to {pkg.destination}) is on {booking.travel_date}.",
            booking_id=booking.id,
        )
        created += 1
    if created:
        db.commit()
    return created
