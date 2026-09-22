-- ============================================================================
-- Supabase PostgreSQL Schema for Tourist Management System
-- Source of Truth: SRS Version 1.0 (FR-01 to FR-06, NFR-01 to NFR-04)
-- ============================================================================

-- 1. Users Table (Tourists and Administrators)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tourist')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Hotels Table
CREATE TABLE IF NOT EXISTS public.hotels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tour Packages Table
CREATE TABLE IF NOT EXISTS public.packages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    hotel_id BIGINT NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    available_date DATE NOT NULL,
    image_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id BIGSERIAL PRIMARY KEY,
    tourist_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
    travel_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('confirmed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed')),
    reference VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Notifications Table (Recorded Delivery Log)
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    tourist_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
    ntype VARCHAR(50) NOT NULL CHECK (ntype IN ('confirmation', 'receipt', 'reminder')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    delivered SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for High Performance Queries (satisfying NFR-01 < 2s response)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_packages_destination ON public.packages(destination);
CREATE INDEX IF NOT EXISTS idx_packages_available_date ON public.packages(available_date);
CREATE INDEX IF NOT EXISTS idx_packages_hotel_id ON public.packages(hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tourist_id ON public.bookings(tourist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON public.bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tourist_id ON public.notifications(tourist_id);

-- ============================================================================
-- Row Level Security (RLS) Configuration for Supabase
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read access to packages and hotels (for browsing/searching)
CREATE POLICY "Public read packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Public read hotels" ON public.hotels FOR SELECT USING (true);

-- Allow full access for backend service role key
CREATE POLICY "Service role full access users" ON public.users USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access hotels" ON public.hotels USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access packages" ON public.packages USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access bookings" ON public.bookings USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access payments" ON public.payments USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access notifications" ON public.notifications USING (true) WITH CHECK (true);

-- ============================================================================
-- Initial Data Migration (Preserving All 4 Users, 16 Hotels, 16 Packages)
-- ============================================================================

-- Insert Users (if not already existing)
INSERT INTO public.users (id, name, email, password_hash, role, created_at)
VALUES 
    (1, 'System Admin', 'admin@example.com', '$2a$10$w3b7hK6wVz9gR1Yg1S1yO.f1k5cW3a4j6q0m9l8k7j6h5g4f3e2d1', 'admin', NOW()),
    (2, 'System Admin', 'admin@tourmanager.com', '$2a$10$tZc4s.4sWjX5Ew6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5', 'admin', NOW()),
    (3, 'Test Admin', 'admin@test.com', '$2a$10$a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a', 'admin', NOW()),
    (4, 'Alex Traveler', 'tourist@example.com', '$2a$10$h7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i', 'tourist', NOW())
ON CONFLICT (email) DO NOTHING;

-- Reset users sequence
SELECT setval('public.users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.users));

-- Insert Hotels
INSERT INTO public.hotels (id, name, location, description)
VALUES
    (1, 'Grand Swiss Resort', 'Zermatt, Switzerland', 'Alpine lodge with mountain views.'),
    (2, 'Sun Siyam Vilu', 'Maldives', 'Overwater villas on a private atoll.'),
    (3, 'Hotel Colosseum', 'Rome, Italy', 'Historic stay near the ancient centre.'),
    (4, 'Marina Bay Suites', 'Singapore', 'City skyline rooms with harbour access.'),
    (5, 'Le Meurice', 'Paris, France', 'Luxury hotel overlooking the Tuileries Garden.'),
    (6, 'Park Hyatt Tokyo', 'Tokyo, Japan', 'Iconic high-rise hotel in Shinjuku.'),
    (7, 'Burj Al Arab', 'Dubai, UAE', 'Iconic sail-shaped luxury hotel.'),
    (8, 'Santa Caterina', 'Amalfi, Italy', '19th-century villa on a cliff.'),
    (9, 'Grace Hotel Santorini', 'Santorini, Greece', 'Cliffside infinity pool and Aegean Sea panoramas.'),
    (10, 'Hoshinoya Kyoto', 'Kyoto, Japan', 'Riverside ryokan retreat nestled in historic Arashiyama.'),
    (11, 'Four Seasons Resort Sayan', 'Bali, Indonesia', 'Luxurious valley sanctuary hidden in Ubud''s lush jungle.'),
    (12, 'Hotel Arts Barcelona', 'Barcelona, Spain', 'Contemporary seafront haven next to Port Olímpic.'),
    (13, 'The Plaza Hotel', 'New York, USA', 'Legendary Fifth Avenue luxury adjacent to Central Park.'),
    (14, 'Marriott Mena House', 'Cairo, Egypt', 'Historic palace hotel overlooking the Great Pyramids of Giza.'),
    (15, 'The Retreat at Blue Lagoon', 'Reykjavik, Iceland', 'Geothermal sanctuary surrounded by volcanic landscapes.'),
    (16, 'The Silo Hotel', 'Cape Town, South Africa', 'Architectural marvel towering above the V&A Waterfront.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    description = EXCLUDED.description;

-- Reset hotels sequence
SELECT setval('public.hotels_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.hotels));

-- Insert Packages
INSERT INTO public.packages (id, name, destination, hotel_id, price, available_date, image_url, description)
VALUES
    (1, 'Alpine Winter Express', 'Switzerland', 1, 1200.00, '2026-11-15', 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=900&q=80', 'Guided alpine tour with resort stay and scenic rail.'),
    (2, 'Tropical Paradise Getaway', 'Maldives', 2, 1500.00, '2026-12-01', 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=900&q=80', 'Island hopping, snorkel day, and villa stay.'),
    (3, 'Historic Cultural Tour', 'Rome', 3, 850.00, '2026-10-20', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80', 'Colosseum, Vatican, and guided city walks.'),
    (4, 'Garden City Explorer', 'Singapore', 4, 980.00, '2026-09-20', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80', 'Marina, gardens, and food trail package.'),
    (5, 'Parisian Romance', 'Paris, France', 5, 1400.00, '2026-11-10', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80', 'Eiffel Tower, Louvre, and Seine river cruise.'),
    (6, 'Tokyo Lights', 'Tokyo, Japan', 6, 1800.00, '2026-10-05', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80', 'Experience vibrant Shinjuku, sushi making, and temples.'),
    (7, 'Dubai Desert Safari', 'Dubai, UAE', 7, 2200.00, '2026-12-15', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80', 'Dune bashing, luxury shopping, and Burj Khalifa.'),
    (8, 'Amalfi Coast Retreat', 'Amalfi, Italy', 8, 1600.00, '2026-09-25', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80', 'Coastal drives, lemon groves, and Mediterranean dining.'),
    (9, 'Santorini Sunset & Caldera Cruise', 'Santorini, Greece', 9, 1350.00, '2026-10-15', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=900&q=80', 'Catamaran caldera cruise, Oia sunset wine tasting, and cliffside luxury stay.'),
    (10, 'Kyoto Bamboo & Zen Heritage', 'Kyoto, Japan', 10, 1650.00, '2026-11-20', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80', 'Arashiyama bamboo grove, Golden Pavilion, traditional tea ceremony, and temple walks.'),
    (11, 'Bali Cultural & Jungle Retreat', 'Bali, Indonesia', 11, 1100.00, '2026-10-28', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80', 'Ubud monkey forest, scenic rice terraces, sacred water temple blessing, and spa retreat.'),
    (12, 'Barcelona Gothic & Gaudí Splendor', 'Barcelona, Spain', 12, 950.00, '2026-11-05', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=900&q=80', 'Sagrada Família private tour, Park Güell, tapas tasting, and Gothic Quarter strolls.'),
    (13, 'New York Skyline & Broadway VIP', 'New York, USA', 13, 1750.00, '2026-12-10', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80', 'Central Park carriage, Top of the Rock admission, Broadway show tickets, and luxury stay.'),
    (14, 'Pyramids & Nile River Odyssey', 'Cairo, Egypt', 14, 1250.00, '2026-11-18', 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=900&q=80', 'Private Egyptologist tour of the Giza Pyramids, Sphinx, Grand Museum, and sunset Nile felucca.'),
    (15, 'Iceland Northern Lights & Glaciers', 'Reykjavik, Iceland', 15, 1900.00, '2026-12-05', 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=900&q=80', 'Chasing the Aurora Borealis, Golden Circle waterfalls, glacier hike, and geothermal spa entry.'),
    (16, 'Cape Town Coast & Table Mountain', 'Cape Town, South Africa', 16, 1450.00, '2026-11-28', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=900&q=80', 'Table Mountain cableway, Cape Peninsula scenic drive, Boulders Beach penguins, and winery tour.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    destination = EXCLUDED.destination,
    hotel_id = EXCLUDED.hotel_id,
    price = EXCLUDED.price,
    available_date = EXCLUDED.available_date,
    image_url = EXCLUDED.image_url,
    description = EXCLUDED.description;

-- Reset packages sequence
SELECT setval('public.packages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.packages));

-- ============================================================================
-- 7. REVIEWS TABLE (Optional Feature Enhancement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    tourist_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tourist_name VARCHAR(255) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    travel_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Tourists can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Seed initial reviews
INSERT INTO public.reviews (id, package_id, tourist_id, tourist_name, rating, comment)
VALUES
    (1, 1, 4, 'Alex Traveler', 5, 'The Swiss alpine train and Zermatt views exceeded all expectations! The hotel was cozy with breathtaking mountain vistas.'),
    (2, 2, 4, 'Liam O''Connor', 5, 'Maldives overwater villa was pure paradise. Snorkeling with sea turtles was unforgettable.'),
    (3, 9, 4, 'Elena Rostova', 5, 'The sunset catamaran cruise in Santorini was the highlight of our European summer! 10/10.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.reviews_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.reviews));
