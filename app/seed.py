from datetime import date

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import Hotel, Package, User


def seed_if_empty(db: Session) -> None:
    if not db.query(User).first():
        admin = User(
            name="System Admin",
            email="admin@example.com",
            password_hash=hash_password("Admin123!"),
            role="admin",
        )
        tourist = User(
            name="Alex Traveler",
            email="tourist@example.com",
            password_hash=hash_password("Tourist123!"),
            role="tourist",
        )
        db.add_all([admin, tourist])
        db.flush()

    admin = User(
        name="System Admin",
        email="admin@example.com",
        password_hash=hash_password("Admin123!"),
        role="admin",
    )
    tourist = User(
        name="Alex Traveler",
        email="tourist@example.com",
        password_hash=hash_password("Tourist123!"),
        role="tourist",
    )
    db.add_all([admin, tourist])
    db.flush()

    if db.query(Hotel).count() < 8:
        # clear existing to replace
        db.query(Package).delete()
        db.query(Hotel).delete()
        db.flush()

        hotels = [
            Hotel(name="Grand Swiss Resort", location="Zermatt, Switzerland", description="Alpine lodge with mountain views."),
            Hotel(name="Sun Siyam Vilu", location="Maldives", description="Overwater villas on a private atoll."),
            Hotel(name="Hotel Colosseum", location="Rome, Italy", description="Historic stay near the ancient centre."),
            Hotel(name="Marina Bay Suites", location="Singapore", description="City skyline rooms with harbour access."),
            Hotel(name="Le Meurice", location="Paris, France", description="Luxury hotel overlooking the Tuileries Garden."),
            Hotel(name="Park Hyatt Tokyo", location="Tokyo, Japan", description="Iconic high-rise hotel in Shinjuku."),
            Hotel(name="Burj Al Arab", location="Dubai, UAE", description="Iconic sail-shaped luxury hotel."),
            Hotel(name="Santa Caterina", location="Amalfi, Italy", description="19th-century villa on a cliff.")
        ]
        db.add_all(hotels)
        db.flush()

        packages = [
            Package(
                name="Alpine Winter Express",
                destination="Switzerland",
                hotel_id=hotels[0].id,
                price=1200,
                available_date=date(2026, 11, 15),
                image_url="https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=900&q=80",
                description="Guided alpine tour with resort stay and scenic rail.",
            ),
            Package(
                name="Tropical Paradise Getaway",
                destination="Maldives",
                hotel_id=hotels[1].id,
                price=1500,
                available_date=date(2026, 12, 1),
                image_url="https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=900&q=80",
                description="Island hopping, snorkel day, and villa stay.",
            ),
            Package(
                name="Historic Cultural Tour",
                destination="Rome",
                hotel_id=hotels[2].id,
                price=850,
                available_date=date(2026, 10, 20),
                image_url="https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80",
                description="Colosseum, Vatican, and guided city walks.",
            ),
            Package(
                name="Garden City Explorer",
                destination="Singapore",
                hotel_id=hotels[3].id,
                price=980,
                available_date=date(2026, 9, 20),
                image_url="https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80",
                description="Marina, gardens, and food trail package.",
            ),
            Package(
                name="Parisian Romance",
                destination="Paris, France",
                hotel_id=hotels[4].id,
                price=1400,
                available_date=date(2026, 11, 10),
                image_url="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
                description="Eiffel Tower, Louvre, and Seine river cruise.",
            ),
            Package(
                name="Tokyo Lights",
                destination="Tokyo, Japan",
                hotel_id=hotels[5].id,
                price=1800,
                available_date=date(2026, 10, 5),
                image_url="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80",
                description="Experience vibrant Shinjuku, sushi making, and temples.",
            ),
            Package(
                name="Dubai Desert Safari",
                destination="Dubai, UAE",
                hotel_id=hotels[6].id,
                price=2200,
                available_date=date(2026, 12, 15),
                image_url="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
                description="Dune bashing, luxury shopping, and Burj Khalifa.",
            ),
            Package(
                name="Amalfi Coast Retreat",
                destination="Amalfi, Italy",
                hotel_id=hotels[7].id,
                price=1600,
                available_date=date(2026, 9, 25),
                image_url="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80",
                description="Coastal drives, lemon groves, and Mediterranean dining.",
            )
        ]
        db.add_all(packages)
        db.commit()
