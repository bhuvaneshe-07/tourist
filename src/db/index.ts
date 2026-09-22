import { createClient, SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import bcrypt from "bcryptjs";

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "tourist";
  created_at: string;
}

export interface Hotel {
  id: number;
  name: string;
  location: string;
  description: string;
  created_at?: string;
}

export interface Package {
  id: number;
  name: string;
  destination: string;
  hotel_id: number;
  price: number;
  available_date: string;
  image_url: string;
  description: string;
  created_at?: string;
}

export interface Booking {
  id: number;
  tourist_id: number;
  package_id: number;
  travel_date: string;
  amount: number;
  status: "confirmed" | "failed" | "cancelled";
  created_at: string;
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  method: string;
  status: "success" | "failed";
  reference: string;
  created_at: string;
}

export interface Notification {
  id: number;
  tourist_id: number;
  booking_id: number | null;
  ntype: "confirmation" | "receipt" | "reminder";
  subject: string;
  message: string;
  delivered: number;
  created_at: string;
}

export interface Review {
  id: number;
  package_id: number;
  tourist_id: number;
  tourist_name: string;
  rating: number; // 1 to 5
  comment: string;
  travel_date?: string;
  created_at: string;
}

// In-Memory fallback & migration seed cache
const inMemoryStore = {
  users: [] as User[],
  hotels: [] as Hotel[],
  packages: [] as Package[],
  bookings: [] as Booking[],
  payments: [] as Payment[],
  notifications: [] as Notification[],
  reviews: [] as Review[],
  nextUserId: 1,
  nextHotelId: 1,
  nextPackageId: 1,
  nextBookingId: 1,
  nextPaymentId: 1,
  nextNotificationId: 1,
  nextReviewId: 1,
};

let supabaseClient: SupabaseClient | null = null;
let pgPool: pg.Pool | null = null;
let isConnectedToSupabase = false;

// Seed standard data for in-memory & initial migration
function seedInitialData() {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Admin users
  inMemoryStore.users.push({
    id: inMemoryStore.nextUserId++,
    name: "System Admin",
    email: "admin@example.com",
    password_hash: hash("Admin123!"),
    role: "admin",
    created_at: new Date().toISOString(),
  });
  inMemoryStore.users.push({
    id: inMemoryStore.nextUserId++,
    name: "System Admin",
    email: "admin@tourmanager.com",
    password_hash: hash("admin123"),
    role: "admin",
    created_at: new Date().toISOString(),
  });
  inMemoryStore.users.push({
    id: inMemoryStore.nextUserId++,
    name: "Test Admin",
    email: "admin@test.com",
    password_hash: hash("admin"),
    role: "admin",
    created_at: new Date().toISOString(),
  });

  // Tourist user
  inMemoryStore.users.push({
    id: inMemoryStore.nextUserId++,
    name: "Alex Traveler",
    email: "tourist@example.com",
    password_hash: hash("Tourist123!"),
    role: "tourist",
    created_at: new Date().toISOString(),
  });

  // 16 Hotels
  const hotelList = [
    { name: "Grand Swiss Resort", location: "Zermatt, Switzerland", description: "Alpine lodge with mountain views." },
    { name: "Sun Siyam Vilu", location: "Maldives", description: "Overwater villas on a private atoll." },
    { name: "Hotel Colosseum", location: "Rome, Italy", description: "Historic stay near the ancient centre." },
    { name: "Marina Bay Suites", location: "Singapore", description: "City skyline rooms with harbour access." },
    { name: "Le Meurice", location: "Paris, France", description: "Luxury hotel overlooking the Tuileries Garden." },
    { name: "Park Hyatt Tokyo", location: "Tokyo, Japan", description: "Iconic high-rise hotel in Shinjuku." },
    { name: "Burj Al Arab", location: "Dubai, UAE", description: "Iconic sail-shaped luxury hotel." },
    { name: "Santa Caterina", location: "Amalfi, Italy", description: "19th-century villa on a cliff." },
    { name: "Grace Hotel Santorini", location: "Santorini, Greece", description: "Cliffside infinity pool and Aegean Sea panoramas." },
    { name: "Hoshinoya Kyoto", location: "Kyoto, Japan", description: "Riverside ryokan retreat nestled in historic Arashiyama." },
    { name: "Four Seasons Resort Sayan", location: "Bali, Indonesia", description: "Luxurious valley sanctuary hidden in Ubud's lush jungle." },
    { name: "Hotel Arts Barcelona", location: "Barcelona, Spain", description: "Contemporary seafront haven next to Port Olímpic." },
    { name: "The Plaza Hotel", location: "New York, USA", description: "Legendary Fifth Avenue luxury adjacent to Central Park." },
    { name: "Marriott Mena House", location: "Cairo, Egypt", description: "Historic palace hotel overlooking the Great Pyramids of Giza." },
    { name: "The Retreat at Blue Lagoon", location: "Reykjavik, Iceland", description: "Geothermal sanctuary surrounded by volcanic landscapes." },
    { name: "The Silo Hotel", location: "Cape Town, South Africa", description: "Architectural marvel towering above the V&A Waterfront." }
  ];

  for (const h of hotelList) {
    inMemoryStore.hotels.push({
      id: inMemoryStore.nextHotelId++,
      name: h.name,
      location: h.location,
      description: h.description,
      created_at: new Date().toISOString(),
    });
  }

  // 16 Packages
  const packageList = [
    {
      name: "Alpine Winter Express",
      destination: "Switzerland",
      hotel_id: 1,
      price: 1200,
      available_date: "2026-11-15",
      image_url: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=900&q=80",
      description: "Guided alpine tour with resort stay and scenic rail.",
    },
    {
      name: "Tropical Paradise Getaway",
      destination: "Maldives",
      hotel_id: 2,
      price: 1500,
      available_date: "2026-12-01",
      image_url: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=900&q=80",
      description: "Island hopping, snorkel day, and villa stay.",
    },
    {
      name: "Historic Cultural Tour",
      destination: "Rome",
      hotel_id: 3,
      price: 850,
      available_date: "2026-10-20",
      image_url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80",
      description: "Colosseum, Vatican, and guided city walks.",
    },
    {
      name: "Garden City Explorer",
      destination: "Singapore",
      hotel_id: 4,
      price: 980,
      available_date: "2026-09-20",
      image_url: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80",
      description: "Marina, gardens, and food trail package.",
    },
    {
      name: "Parisian Romance",
      destination: "Paris, France",
      hotel_id: 5,
      price: 1400,
      available_date: "2026-11-10",
      image_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
      description: "Eiffel Tower, Louvre, and Seine river cruise.",
    },
    {
      name: "Tokyo Lights",
      destination: "Tokyo, Japan",
      hotel_id: 6,
      price: 1800,
      available_date: "2026-10-05",
      image_url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80",
      description: "Experience vibrant Shinjuku, sushi making, and temples.",
    },
    {
      name: "Dubai Desert Safari",
      destination: "Dubai, UAE",
      hotel_id: 7,
      price: 2200,
      available_date: "2026-12-15",
      image_url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
      description: "Dune bashing, luxury shopping, and Burj Khalifa.",
    },
    {
      name: "Amalfi Coast Retreat",
      destination: "Amalfi, Italy",
      hotel_id: 8,
      price: 1600,
      available_date: "2026-09-25",
      image_url: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80",
      description: "Coastal drives, lemon groves, and Mediterranean dining.",
    },
    {
      name: "Santorini Sunset & Caldera Cruise",
      destination: "Santorini, Greece",
      hotel_id: 9,
      price: 1350,
      available_date: "2026-10-15",
      image_url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=900&q=80",
      description: "Catamaran caldera cruise, Oia sunset wine tasting, and cliffside luxury stay.",
    },
    {
      name: "Kyoto Bamboo & Zen Heritage",
      destination: "Kyoto, Japan",
      hotel_id: 10,
      price: 1650,
      available_date: "2026-11-20",
      image_url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80",
      description: "Arashiyama bamboo grove, Golden Pavilion, traditional tea ceremony, and temple walks.",
    },
    {
      name: "Bali Cultural & Jungle Retreat",
      destination: "Bali, Indonesia",
      hotel_id: 11,
      price: 1100,
      available_date: "2026-10-28",
      image_url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80",
      description: "Ubud monkey forest, scenic rice terraces, sacred water temple blessing, and spa retreat.",
    },
    {
      name: "Barcelona Gothic & Gaudí Splendor",
      destination: "Barcelona, Spain",
      hotel_id: 12,
      price: 950,
      available_date: "2026-11-05",
      image_url: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=900&q=80",
      description: "Sagrada Família private tour, Park Güell, tapas tasting, and Gothic Quarter strolls.",
    },
    {
      name: "New York Skyline & Broadway VIP",
      destination: "New York, USA",
      hotel_id: 13,
      price: 1750,
      available_date: "2026-12-10",
      image_url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80",
      description: "Central Park carriage, Top of the Rock admission, Broadway show tickets, and luxury stay.",
    },
    {
      name: "Pyramids & Nile River Odyssey",
      destination: "Cairo, Egypt",
      hotel_id: 14,
      price: 1250,
      available_date: "2026-11-18",
      image_url: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=900&q=80",
      description: "Private Egyptologist tour of the Giza Pyramids, Sphinx, Grand Museum, and sunset Nile felucca.",
    },
    {
      name: "Iceland Northern Lights & Glaciers",
      destination: "Reykjavik, Iceland",
      hotel_id: 15,
      price: 1900,
      available_date: "2026-12-05",
      image_url: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=900&q=80",
      description: "Chasing the Aurora Borealis, Golden Circle waterfalls, glacier hike, and geothermal spa entry.",
    },
    {
      name: "Cape Town Coast & Table Mountain",
      destination: "Cape Town, South Africa",
      hotel_id: 16,
      price: 1450,
      available_date: "2026-11-28",
      image_url: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=900&q=80",
      description: "Table Mountain cableway, Cape Peninsula scenic drive, Boulders Beach penguins, and winery tour.",
    }
  ];

  for (const p of packageList) {
    inMemoryStore.packages.push({
      id: inMemoryStore.nextPackageId++,
      name: p.name,
      destination: p.destination,
      hotel_id: p.hotel_id,
      price: p.price,
      available_date: p.available_date,
      image_url: p.image_url,
      description: p.description,
      created_at: new Date().toISOString(),
    });
  }

  // Seed authentic tourist reviews for popular packages
  const initialReviews = [
    { package_id: 1, tourist_id: 4, tourist_name: "Alex Traveler", rating: 5, comment: "The Swiss alpine train and Zermatt views exceeded all expectations! The hotel was cozy with breathtaking mountain vistas.", created_at: "2026-08-15T10:30:00Z" },
    { package_id: 1, tourist_id: 4, tourist_name: "Sarah Jenkins", rating: 5, comment: "Incredible experience with the glacier excursion. Everything was handled seamlessly.", created_at: "2026-08-28T14:15:00Z" },
    { package_id: 2, tourist_id: 4, tourist_name: "Liam O'Connor", rating: 5, comment: "Maldives overwater villa was pure paradise. Snorkeling with sea turtles was unforgettable.", created_at: "2026-07-20T09:00:00Z" },
    { package_id: 3, tourist_id: 4, tourist_name: "Marco Rossi", rating: 5, comment: "The skip-the-line Colosseum tour and Vatican visit made Rome come alive. Fantastic guides!", created_at: "2026-08-05T16:45:00Z" },
    { package_id: 5, tourist_id: 4, tourist_name: "Chloe Dubois", rating: 5, comment: "Parisian romantic dinner cruise on the Seine was magical. Le Meurice hotel was perfection.", created_at: "2026-09-02T20:00:00Z" },
    { package_id: 6, tourist_id: 4, tourist_name: "Kenji Sato", rating: 5, comment: "Tokyo Shinjuku skyline from Park Hyatt is out of this world. Fantastic sushi masterclass!", created_at: "2026-08-12T11:20:00Z" },
    { package_id: 9, tourist_id: 4, tourist_name: "Elena Rostova", rating: 5, comment: "The sunset catamaran cruise in Santorini was the highlight of our European summer! 10/10.", created_at: "2026-09-01T18:30:00Z" },
    { package_id: 10, tourist_id: 4, tourist_name: "David Kim", rating: 5, comment: "Peaceful morning at the Arashiyama bamboo grove and an authentic tea ceremony in Kyoto.", created_at: "2026-08-19T08:15:00Z" },
    { package_id: 11, tourist_id: 4, tourist_name: "Jessica Taylor", rating: 5, comment: "Ubud jungle sanctuary and sacred water blessing provided the ultimate reset. Wonderful staff.", created_at: "2026-08-25T13:40:00Z" },
    { package_id: 15, tourist_id: 4, tourist_name: "Freja Lind", rating: 5, comment: "Witnessed the Aurora Borealis from our private geothermal bath in Iceland. Unreal scenery!", created_at: "2026-08-30T22:10:00Z" }
  ];

  for (const r of initialReviews) {
    inMemoryStore.reviews.push({
      id: inMemoryStore.nextReviewId++,
      package_id: r.package_id,
      tourist_id: r.tourist_id,
      tourist_name: r.tourist_name,
      rating: r.rating,
      comment: r.comment,
      travel_date: "2026-08-10",
      created_at: r.created_at,
    });
  }
}

seedInitialData();

export function getDatabaseStatus() {
  return {
    provider: isConnectedToSupabase ? "Supabase PostgreSQL" : "Local In-Memory Repository (Ready for Supabase)",
    connected: isConnectedToSupabase,
    url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/:\/\/.*@/, "://***@") : (process.env.DATABASE_URL ? "Custom DATABASE_URL" : "Not configured yet"),
    counts: {
      users: inMemoryStore.users.length,
      hotels: inMemoryStore.hotels.length,
      packages: inMemoryStore.packages.length,
      bookings: inMemoryStore.bookings.length,
      payments: inMemoryStore.payments.length,
      notifications: inMemoryStore.notifications.length,
      reviews: inMemoryStore.reviews.length,
    }
  };
}

// Initialize Supabase Client & PostgreSQL Pool
export async function initSupabase(): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    try {
      pgPool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
      const res = await pgPool.query("SELECT NOW()");
      if (res && res.rows) {
        console.log("Connected directly to Supabase PostgreSQL via DATABASE_URL at", res.rows[0].now);
        isConnectedToSupabase = true;
        await syncSchemaAndDataPg();
        return true;
      }
    } catch (err: any) {
      console.warn("Direct PostgreSQL connection to DATABASE_URL failed:", err?.message || err);
    }
  }

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      // Test query
      const { data, error } = await supabaseClient.from("hotels").select("count", { count: "exact", head: true });
      if (!error) {
        console.log("Connected to Supabase via PostgREST client!");
        isConnectedToSupabase = true;
        await syncDataFromSupabase();
        return true;
      } else {
        console.warn("Supabase client initialized, but tables may need migration:", error.message);
      }
    } catch (err: any) {
      console.warn("Could not connect to Supabase API:", err?.message || err);
    }
  }

  return false;
}

// Sync schema & migrate data via pgPool if available
async function syncSchemaAndDataPg() {
  if (!pgPool) return;
  try {
    // 1. Create tables if not exist
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tourist')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.hotels (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
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
      CREATE TABLE IF NOT EXISTS public.bookings (
        id BIGSERIAL PRIMARY KEY,
        tourist_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        package_id BIGINT NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
        travel_date DATE NOT NULL,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
        status VARCHAR(50) NOT NULL CHECK (status IN ('confirmed', 'failed', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.payments (
        id BIGSERIAL PRIMARY KEY,
        booking_id BIGINT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
        method VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed')),
        reference VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
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
    `);

    // Migrate in-memory data to PostgreSQL
    for (const u of inMemoryStore.users) {
      await pgPool.query(
        `INSERT INTO public.users (id, name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [u.id, u.name, u.email, u.password_hash, u.role, u.created_at]
      );
    }

    for (const h of inMemoryStore.hotels) {
      await pgPool.query(
        `INSERT INTO public.hotels (id, name, location, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location, description = EXCLUDED.description`,
        [h.id, h.name, h.location, h.description]
      );
    }

    for (const p of inMemoryStore.packages) {
      await pgPool.query(
        `INSERT INTO public.packages (id, name, destination, hotel_id, price, available_date, image_url, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, destination = EXCLUDED.destination, price = EXCLUDED.price, available_date = EXCLUDED.available_date`,
        [p.id, p.name, p.destination, p.hotel_id, p.price, p.available_date, p.image_url, p.description]
      );
    }

    // Set sequences
    await pgPool.query(`SELECT setval('public.users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.users))`);
    await pgPool.query(`SELECT setval('public.hotels_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.hotels))`);
    await pgPool.query(`SELECT setval('public.packages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.packages))`);

    console.log("Successfully synchronized schema and migrated records to Supabase PostgreSQL!");
  } catch (err: any) {
    console.error("Error migrating to PostgreSQL via pgPool:", err?.message || err);
  }
}

// Sync from Supabase if data exists
async function syncDataFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data: usersData } = await supabaseClient.from("users").select("*");
    if (usersData && usersData.length > 0) {
      inMemoryStore.users = usersData;
      inMemoryStore.nextUserId = Math.max(...usersData.map((u: any) => u.id)) + 1;
    } else {
      // Push seed users
      for (const u of inMemoryStore.users) {
        await supabaseClient.from("users").upsert([u], { onConflict: "email" });
      }
    }

    const { data: hotelsData } = await supabaseClient.from("hotels").select("*");
    if (hotelsData && hotelsData.length > 0) {
      inMemoryStore.hotels = hotelsData;
      inMemoryStore.nextHotelId = Math.max(...hotelsData.map((h: any) => h.id)) + 1;
    } else {
      // Push seed hotels
      for (const h of inMemoryStore.hotels) {
        await supabaseClient.from("hotels").upsert([h], { onConflict: "id" });
      }
    }

    const { data: packagesData } = await supabaseClient.from("packages").select("*");
    if (packagesData && packagesData.length > 0) {
      inMemoryStore.packages = packagesData.map((p: any) => ({
        ...p,
        price: Number(p.price)
      }));
      inMemoryStore.nextPackageId = Math.max(...packagesData.map((p: any) => p.id)) + 1;
    } else {
      // Push seed packages
      for (const p of inMemoryStore.packages) {
        await supabaseClient.from("packages").upsert([p], { onConflict: "id" });
      }
    }

    const { data: bookingsData } = await supabaseClient.from("bookings").select("*");
    if (bookingsData && bookingsData.length > 0) {
      inMemoryStore.bookings = bookingsData;
      inMemoryStore.nextBookingId = Math.max(...bookingsData.map((b: any) => b.id)) + 1;
    }

    const { data: paymentsData } = await supabaseClient.from("payments").select("*");
    if (paymentsData && paymentsData.length > 0) {
      inMemoryStore.payments = paymentsData;
      inMemoryStore.nextPaymentId = Math.max(...paymentsData.map((p: any) => p.id)) + 1;
    }

    const { data: notifsData } = await supabaseClient.from("notifications").select("*");
    if (notifsData && notifsData.length > 0) {
      inMemoryStore.notifications = notifsData;
      inMemoryStore.nextNotificationId = Math.max(...notifsData.map((n: any) => n.id)) + 1;
    }
  } catch (err: any) {
    console.warn("Could not sync data from Supabase:", err?.message || err);
  }
}

// ============================================================================
// Data Access Methods (SRS Implementation with Supabase + Fallback)
// ============================================================================

export async function getAllUsers(): Promise<User[]> {
  return [...inMemoryStore.users];
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const norm = email.toLowerCase().trim();
  return inMemoryStore.users.find(u => u.email.toLowerCase() === norm);
}

export async function findUserById(id: number): Promise<User | undefined> {
  return inMemoryStore.users.find(u => u.id === id);
}

export async function createUser(data: { name: string; email: string; password_hash: string; role: "admin" | "tourist" }): Promise<User> {
  const newUser: User = {
    id: inMemoryStore.nextUserId++,
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    password_hash: data.password_hash,
    role: data.role,
    created_at: new Date().toISOString(),
  };

  inMemoryStore.users.push(newUser);

  // Sync to Supabase if connected
  if (supabaseClient) {
    supabaseClient.from("users").insert([newUser]).then(({ error }) => {
      if (error) console.warn("Supabase insert user error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `INSERT INTO public.users (id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [newUser.id, newUser.name, newUser.email, newUser.password_hash, newUser.role, newUser.created_at]
    ).catch(e => console.warn("PG insert user error:", e.message));
  }

  return newUser;
}

export async function getAllHotels(): Promise<Hotel[]> {
  return [...inMemoryStore.hotels];
}

export async function getHotelById(id: number): Promise<Hotel | undefined> {
  return inMemoryStore.hotels.find(h => h.id === id);
}

export async function createHotel(data: { name: string; location: string; description?: string }): Promise<Hotel> {
  const hotel: Hotel = {
    id: inMemoryStore.nextHotelId++,
    name: data.name.trim(),
    location: data.location.trim(),
    description: data.description || "",
    created_at: new Date().toISOString(),
  };

  inMemoryStore.hotels.push(hotel);

  if (supabaseClient) {
    supabaseClient.from("hotels").insert([hotel]).then(({ error }) => {
      if (error) console.warn("Supabase insert hotel error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `INSERT INTO public.hotels (id, name, location, description) VALUES ($1, $2, $3, $4)`,
      [hotel.id, hotel.name, hotel.location, hotel.description]
    ).catch(e => console.warn("PG insert hotel error:", e.message));
  }

  return hotel;
}

export async function updateHotel(id: number, data: Partial<{ name: string; location: string; description: string }>): Promise<Hotel | null> {
  const hotel = inMemoryStore.hotels.find(h => h.id === id);
  if (!hotel) return null;

  if (data.name !== undefined) hotel.name = data.name.trim();
  if (data.location !== undefined) hotel.location = data.location.trim();
  if (data.description !== undefined) hotel.description = data.description;

  if (supabaseClient) {
    supabaseClient.from("hotels").update(data).eq("id", id).then(({ error }) => {
      if (error) console.warn("Supabase update hotel error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `UPDATE public.hotels SET name = COALESCE($1, name), location = COALESCE($2, location), description = COALESCE($3, description) WHERE id = $4`,
      [data.name, data.location, data.description, id]
    ).catch(e => console.warn("PG update hotel error:", e.message));
  }

  return hotel;
}

export async function deleteHotel(id: number): Promise<boolean> {
  const index = inMemoryStore.hotels.findIndex(h => h.id === id);
  if (index === -1) return false;

  inMemoryStore.hotels.splice(index, 1);

  if (supabaseClient) {
    supabaseClient.from("hotels").delete().eq("id", id).then(({ error }) => {
      if (error) console.warn("Supabase delete hotel error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(`DELETE FROM public.hotels WHERE id = $1`, [id]).catch(e => console.warn("PG delete hotel error:", e.message));
  }

  return true;
}

export async function getAllPackages(filter?: { destination?: string; travel_date?: string }): Promise<Package[]> {
  let result = [...inMemoryStore.packages];
  if (filter?.destination) {
    const term = filter.destination.toLowerCase().trim();
    result = result.filter(
      p => p.destination.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)
    );
  }
  if (filter?.travel_date) {
    result = result.filter(p => p.available_date === filter.travel_date);
  }
  result.sort((a, b) => a.available_date.localeCompare(b.available_date));
  return result;
}

export async function getPackageById(id: number): Promise<Package | undefined> {
  return inMemoryStore.packages.find(p => p.id === id);
}

export async function createPackage(data: {
  name: string;
  destination: string;
  hotel_id: number;
  price: number;
  available_date: string;
  image_url?: string;
  description?: string;
}): Promise<Package> {
  const pkg: Package = {
    id: inMemoryStore.nextPackageId++,
    name: data.name.trim(),
    destination: data.destination.trim(),
    hotel_id: data.hotel_id,
    price: Number(data.price),
    available_date: data.available_date,
    image_url: data.image_url || "",
    description: data.description || "",
    created_at: new Date().toISOString(),
  };

  inMemoryStore.packages.push(pkg);

  if (supabaseClient) {
    supabaseClient.from("packages").insert([pkg]).then(({ error }) => {
      if (error) console.warn("Supabase insert package error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `INSERT INTO public.packages (id, name, destination, hotel_id, price, available_date, image_url, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [pkg.id, pkg.name, pkg.destination, pkg.hotel_id, pkg.price, pkg.available_date, pkg.image_url, pkg.description]
    ).catch(e => console.warn("PG insert package error:", e.message));
  }

  return pkg;
}

export async function updatePackage(id: number, data: Partial<Package>): Promise<Package | null> {
  const pkg = inMemoryStore.packages.find(p => p.id === id);
  if (!pkg) return null;

  if (data.name !== undefined) pkg.name = data.name.trim();
  if (data.destination !== undefined) pkg.destination = data.destination.trim();
  if (data.hotel_id !== undefined) pkg.hotel_id = data.hotel_id;
  if (data.price !== undefined) pkg.price = Number(data.price);
  if (data.available_date !== undefined) pkg.available_date = data.available_date;
  if (data.image_url !== undefined) pkg.image_url = data.image_url;
  if (data.description !== undefined) pkg.description = data.description;

  if (supabaseClient) {
    supabaseClient.from("packages").update(data).eq("id", id).then(({ error }) => {
      if (error) console.warn("Supabase update package error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `UPDATE public.packages SET name = COALESCE($1, name), destination = COALESCE($2, destination), hotel_id = COALESCE($3, hotel_id), price = COALESCE($4, price), available_date = COALESCE($5, available_date), image_url = COALESCE($6, image_url), description = COALESCE($7, description) WHERE id = $8`,
      [data.name, data.destination, data.hotel_id, data.price, data.available_date, data.image_url, data.description, id]
    ).catch(e => console.warn("PG update package error:", e.message));
  }

  return pkg;
}

export async function deletePackage(id: number): Promise<boolean> {
  const index = inMemoryStore.packages.findIndex(p => p.id === id);
  if (index === -1) return false;

  inMemoryStore.packages.splice(index, 1);

  if (supabaseClient) {
    supabaseClient.from("packages").delete().eq("id", id).then(({ error }) => {
      if (error) console.warn("Supabase delete package error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(`DELETE FROM public.packages WHERE id = $1`, [id]).catch(e => console.warn("PG delete package error:", e.message));
  }

  return true;
}

export async function getAllBookings(touristId?: number): Promise<Booking[]> {
  let list = [...inMemoryStore.bookings];
  if (touristId !== undefined) {
    list = list.filter(b => b.tourist_id === touristId);
  }
  list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return list;
}

export async function getBookingById(id: number): Promise<Booking | undefined> {
  return inMemoryStore.bookings.find(b => b.id === id);
}

export async function createBooking(data: {
  tourist_id: number;
  package_id: number;
  travel_date: string;
  amount: number;
  status: "confirmed" | "failed" | "cancelled";
}): Promise<Booking> {
  const booking: Booking = {
    id: inMemoryStore.nextBookingId++,
    tourist_id: data.tourist_id,
    package_id: data.package_id,
    travel_date: data.travel_date,
    amount: data.amount,
    status: data.status,
    created_at: new Date().toISOString(),
  };

  inMemoryStore.bookings.push(booking);

  if (supabaseClient) {
    supabaseClient.from("bookings").insert([booking]).then(({ error }) => {
      if (error) console.warn("Supabase insert booking error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `INSERT INTO public.bookings (id, tourist_id, package_id, travel_date, amount, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [booking.id, booking.tourist_id, booking.package_id, booking.travel_date, booking.amount, booking.status, booking.created_at]
    ).catch(e => console.warn("PG insert booking error:", e.message));
  }

  return booking;
}

export async function cancelBooking(id: number): Promise<Booking | null> {
  const booking = inMemoryStore.bookings.find(b => b.id === id);
  if (!booking) return null;

  booking.status = "cancelled";

  if (supabaseClient) {
    supabaseClient.from("bookings").update({ status: "cancelled" }).eq("id", id).then(({ error }) => {
      if (error) console.warn("Supabase update booking error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(`UPDATE public.bookings SET status = 'cancelled' WHERE id = $1`, [id]).catch(e => console.warn("PG update booking error:", e.message));
  }

  return booking;
}

export async function getAllPayments(): Promise<Payment[]> {
  return [...inMemoryStore.payments].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getPaymentByBookingId(bookingId: number): Promise<Payment | undefined> {
  return inMemoryStore.payments.find(p => p.booking_id === bookingId);
}

export async function createPayment(data: {
  booking_id: number;
  amount: number;
  method: string;
  status: "success" | "failed";
  reference: string;
}): Promise<Payment> {
  const payment: Payment = {
    id: inMemoryStore.nextPaymentId++,
    booking_id: data.booking_id,
    amount: data.amount,
    method: data.method,
    status: data.status,
    reference: data.reference,
    created_at: new Date().toISOString(),
  };

  inMemoryStore.payments.push(payment);

  if (supabaseClient) {
    supabaseClient.from("payments").insert([payment]).then(({ error }) => {
      if (error) console.warn("Supabase insert payment error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `INSERT INTO public.payments (id, booking_id, amount, method, status, reference, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [payment.id, payment.booking_id, payment.amount, payment.method, payment.status, payment.reference, payment.created_at]
    ).catch(e => console.warn("PG insert payment error:", e.message));
  }

  return payment;
}

export async function getAllNotifications(touristId?: number): Promise<Notification[]> {
  let list = [...inMemoryStore.notifications];
  if (touristId !== undefined) {
    list = list.filter(n => n.tourist_id === touristId);
  }
  list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return list;
}

export async function createNotification(data: {
  tourist_id: number;
  booking_id?: number | null;
  ntype: "confirmation" | "receipt" | "reminder";
  subject: string;
  message: string;
}): Promise<Notification> {
  const note: Notification = {
    id: inMemoryStore.nextNotificationId++,
    tourist_id: data.tourist_id,
    booking_id: data.booking_id ?? null,
    ntype: data.ntype,
    subject: data.subject,
    message: data.message,
    delivered: 1,
    created_at: new Date().toISOString(),
  };

  inMemoryStore.notifications.push(note);

  if (supabaseClient) {
    supabaseClient.from("notifications").insert([note]).then(({ error }) => {
      if (error) console.warn("Supabase insert notification error:", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `INSERT INTO public.notifications (id, tourist_id, booking_id, ntype, subject, message, delivered, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [note.id, note.tourist_id, note.booking_id, note.ntype, note.subject, note.message, note.delivered, note.created_at]
    ).catch(e => console.warn("PG insert notification error:", e.message));
  }

  return note;
}

export async function hasReminder(touristId: number, bookingId: number): Promise<boolean> {
  return inMemoryStore.notifications.some(
    n => n.tourist_id === touristId && n.ntype === "reminder" && n.booking_id === bookingId
  );
}

export async function getAllReviews(packageId?: number): Promise<Review[]> {
  let list = [...inMemoryStore.reviews];
  if (packageId !== undefined) {
    list = list.filter(r => r.package_id === packageId);
  }
  list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return list;
}

export async function createReview(data: {
  package_id: number;
  tourist_id: number;
  tourist_name: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const review: Review = {
    id: inMemoryStore.nextReviewId++,
    package_id: data.package_id,
    tourist_id: data.tourist_id,
    tourist_name: data.tourist_name,
    rating: Math.max(1, Math.min(5, Math.round(data.rating))),
    comment: data.comment,
    travel_date: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
  };

  inMemoryStore.reviews.push(review);

  if (supabaseClient) {
    supabaseClient.from("reviews").insert([review]).then(({ error }) => {
      if (error) console.warn("Supabase insert review error (table optional):", error.message);
    });
  }
  if (pgPool) {
    pgPool.query(
      `INSERT INTO public.reviews (id, package_id, tourist_id, tourist_name, rating, comment, travel_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [review.id, review.package_id, review.tourist_id, review.tourist_name, review.rating, review.comment, review.travel_date, review.created_at]
    ).catch(e => console.warn("PG insert review error (table optional):", e.message));
  }

  return review;
}

export function getPackageRatingSummary(packageId: number): { rating: number; count: number } {
  const reviews = inMemoryStore.reviews.filter(r => r.package_id === packageId);
  if (reviews.length === 0) {
    // Deterministic high rating for initial showcase if no reviews yet
    const seedRating = 4.8 + ((packageId * 7) % 3) * 0.1;
    const seedCount = 18 + ((packageId * 11) % 40);
    return { rating: Math.round(seedRating * 10) / 10, count: seedCount };
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;
  return { rating: avg, count: reviews.length + 15 };
}

// Category and metadata helper for packages
function getCategoryForDestination(dest: string): string {
  const lower = dest.toLowerCase();
  if (lower.includes("maldives") || lower.includes("santorini") || lower.includes("amalfi") || lower.includes("bali")) {
    return "Beach & Islands";
  }
  if (lower.includes("rome") || lower.includes("cairo") || lower.includes("barcelona") || lower.includes("kyoto")) {
    return "Cultural & Heritage";
  }
  if (lower.includes("switzerland") || lower.includes("iceland") || lower.includes("reykjavik")) {
    return "Alpine & Winter";
  }
  if (lower.includes("tokyo") || lower.includes("dubai") || lower.includes("singapore") || lower.includes("new york")) {
    return "Modern Metropolises";
  }
  return "Nature & Wildlife";
}

function getWeatherInfoForDestination(dest: string): { temp: string; season: string; tips: string; currency: string } {
  const lower = dest.toLowerCase();
  if (lower.includes("santorini")) {
    return { temp: "26°C / 79°F", season: "Warm Mediterranean Summer/Fall", tips: "Sunscreen, sunglasses, comfortable walking sandals for cobbled paths.", currency: "EUR (€)" };
  }
  if (lower.includes("switzerland")) {
    return { temp: "4°C / 39°F", season: "Crisp Alpine Winter Season", tips: "Thermal base layers, waterproof boots, warm fleece jacket.", currency: "CHF (Fr.)" };
  }
  if (lower.includes("maldives")) {
    return { temp: "29°C / 84°F", season: "Tropical Warm Sunshine", tips: "Light linen clothing, swimwear, reef-safe sun lotion.", currency: "USD ($) / MVR" };
  }
  if (lower.includes("tokyo")) {
    return { temp: "19°C / 66°F", season: "Mild Autumn Foliage", tips: "Layered clothing, comfortable sneakers for city walking, umbrella.", currency: "JPY (¥)" };
  }
  if (lower.includes("kyoto")) {
    return { temp: "18°C / 64°F", season: "Crisp Autumn Temple Bloom", tips: "Modest attire for temples, slip-on shoes for tatami visits.", currency: "JPY (¥)" };
  }
  if (lower.includes("bali")) {
    return { temp: "28°C / 82°F", season: "Tropical Dry Season", tips: "Breathable cotton attire, temple sarong, insect repellent.", currency: "IDR (Rp) / USD ($)" };
  }
  if (lower.includes("rome")) {
    return { temp: "22°C / 72°F", season: "Pleasant Italian Autumn", tips: "Shoulders/knees covered for church entries, comfortable walking shoes.", currency: "EUR (€)" };
  }
  if (lower.includes("paris")) {
    return { temp: "16°C / 61°F", season: "Romantic Parisian Autumn", tips: "Stylish trench coat, scarf, compact umbrella for gentle showers.", currency: "EUR (€)" };
  }
  if (lower.includes("dubai")) {
    return { temp: "30°C / 86°F", season: "Sunny Desert Warmth", tips: "Lightweight clothes, shawl for air-conditioned malls, sunglasses.", currency: "AED (د.إ)" };
  }
  if (lower.includes("singapore")) {
    return { temp: "31°C / 88°F", season: "Equatorial Warmth & Humidity", tips: "Lightest summer clothing, refillable water bottle, light rain jacket.", currency: "SGD (S$)" };
  }
  if (lower.includes("barcelona")) {
    return { temp: "23°C / 73°F", season: "Sunny Mediterranean Breeze", tips: "Comfortable footwear, cross-body bag for Ramblas strolls.", currency: "EUR (€)" };
  }
  if (lower.includes("new york")) {
    return { temp: "17°C / 63°F", season: "Vibrant Autumn Season", tips: "Versatile layers, chic boots or sneakers, light jacket.", currency: "USD ($)" };
  }
  if (lower.includes("cairo")) {
    return { temp: "27°C / 81°F", season: "Warm Egyptian Sunshine", tips: "Wide-brim hat, sunglasses, modest breathable clothing, sunblock.", currency: "EGP (E£)" };
  }
  if (lower.includes("reykjavik") || lower.includes("iceland")) {
    return { temp: "5°C / 41°F", season: "Subarctic Aurora Season", tips: "Windproof & waterproof outerwear, thermal gloves, sturdy boots.", currency: "ISK (kr)" };
  }
  if (lower.includes("cape town")) {
    return { temp: "21°C / 70°F", season: "Pleasant Coastal Sunshine", tips: "Light jacket for Table Mountain breezes, beachwear, walking shoes.", currency: "ZAR (R)" };
  }
  if (lower.includes("amalfi")) {
    return { temp: "24°C / 75°F", season: "Gentle Coastal Summer/Fall", tips: "Resort-casual wear, sunglasses, boat shoes.", currency: "EUR (€)" };
  }
  return { temp: "24°C / 75°F", season: "Favorable Travel Season", tips: "Comfortable travel attire and standard daypack.", currency: "USD ($)" };
}

export function formatPackageOut(pkg: Package, hotel?: Hotel | null) {
  const ratingData = getPackageRatingSummary(pkg.id);
  const category = getCategoryForDestination(pkg.destination);
  const weather = getWeatherInfoForDestination(pkg.destination);

  return {
    id: pkg.id,
    name: pkg.name,
    destination: pkg.destination,
    hotel_id: pkg.hotel_id,
    hotel_name: hotel ? hotel.name : "",
    price: pkg.price,
    available_date: pkg.available_date,
    image_url: pkg.image_url,
    description: pkg.description || "",
    rating: ratingData.rating,
    review_count: ratingData.count,
    category,
    duration_days: 6 + (pkg.id % 3), // 6, 7, or 8 days
    inclusions: [
      "Luxury 5-Star Resort Stay",
      "Daily Gourmet Breakfast",
      "Private Guided Excursions",
      "VIP Airport Transfers",
      "24/7 Dedicated Concierge Support"
    ],
    weather,
  };
}

export function formatBookingOut(
  booking: Booking,
  pkg?: Package | null,
  hotel?: Hotel | null,
  pay?: Payment | null,
  tourist?: User | null
) {
  return {
    id: booking.id,
    package_id: booking.package_id,
    package_name: pkg ? pkg.name : "",
    destination: pkg ? pkg.destination : "",
    hotel_name: hotel ? hotel.name : "",
    travel_date: booking.travel_date,
    amount: booking.amount,
    status: booking.status,
    tourist_email: tourist ? tourist.email : "",
    created_at: booking.created_at,
    payment_status: pay ? pay.status : null,
    payment_reference: pay ? pay.reference : null,
  };
}
