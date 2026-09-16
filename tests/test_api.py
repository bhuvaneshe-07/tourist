import uuid
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.auth import hash_password

# Use in-memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Create test admin
    if not db.query(User).filter(User.email == "admin@example.com").first():
        db.add(User(name="Admin", email="admin@example.com", password_hash=hash_password("Admin123!"), role="admin"))
    if not db.query(User).filter(User.email == "admin@test.com").first():
        db.add(User(name="Admin", email="admin@test.com", password_hash=hash_password("admin"), role="admin"))
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)


def auth_header(email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_login_rejects_bad_password():
    res = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "wrong"})
    assert res.status_code == 401


def test_register_search_book_ticket_cancel():
    email = f"tourist-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/api/auth/register", json={"name": "New Tourist", "email": email, "password": "Secret123"})
    headers = auth_header(email, "Secret123")

    packages = client.get("/api/packages").json()
    assert packages
    pkg = packages[0]

    fail = client.post(
        "/api/bookings",
        headers=headers,
        json={"package_id": pkg["id"], "payment_method": "card", "account_number": "000011112222"},
    )
    assert fail.status_code == 400

    ok = client.post(
        "/api/bookings",
        headers=headers,
        json={"package_id": pkg["id"], "payment_method": "card", "account_number": "4111111111111111"},
    )
    assert ok.status_code == 200, ok.text
    booking_id = ok.json()["id"]

    history = client.get("/api/bookings/me", headers=headers)
    assert history.status_code == 200
    assert any(b["id"] == booking_id for b in history.json())

    ticket = client.get(f"/api/bookings/{booking_id}/ticket", headers=headers)
    assert ticket.status_code == 200
    assert "TourManager Ticket" in ticket.text

    notes = client.get("/api/notifications", headers=headers).json()
    types = {n["ntype"] for n in notes}
    assert "confirmation" in types
    assert "receipt" in types

    cancel = client.post(f"/api/bookings/{booking_id}/cancel", headers=headers)
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"


def test_admin_crud_and_oversight():
    headers = auth_header("admin@example.com", "Admin123!")
    hotel = client.post(
        "/api/admin/hotels",
        headers=headers,
        json={"name": "Test Inn", "location": "Lisbon", "description": "City stay"},
    )
    assert hotel.status_code == 200, hotel.text
    hotel_id = hotel.json()["id"]

    pkg = client.post(
        "/api/admin/packages",
        headers=headers,
        json={
            "name": "Lisbon Weekend",
            "destination": "Portugal",
            "hotel_id": hotel_id,
            "price": 499,
            "available_date": "2026-09-18",
            "image_url": "https://example.com/lisbon.jpg",
            "description": "Two-night city break",
        },
    )
    assert pkg.status_code == 200, pkg.text
    pkg_id = pkg.json()["id"]

    priced = client.put(f"/api/admin/packages/{pkg_id}/price", headers=headers, json={"price": 525})
    assert priced.status_code == 200
    assert priced.json()["price"] == 525

    found = client.get("/api/packages", params={"destination": "Portugal", "travel_date": "2026-09-18"})
    assert found.status_code == 200
    assert any(p["id"] == pkg_id for p in found.json())

    dash = client.get("/api/admin/dashboard", headers=headers)
    assert dash.status_code == 200
    assert dash.json()["packages"] >= 1

    assert client.get("/api/admin/bookings", headers=headers).status_code == 200
    assert client.get("/api/admin/tourists", headers=headers).status_code == 200
    assert client.get("/api/admin/payments", headers=headers).status_code == 200

    assert client.delete(f"/api/admin/packages/{pkg_id}", headers=headers).status_code == 200
    assert client.delete(f"/api/admin/hotels/{hotel_id}", headers=headers).status_code == 200
