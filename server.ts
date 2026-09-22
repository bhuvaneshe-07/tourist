import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import {
  initSupabase,
  getDatabaseStatus,
  User,
  Hotel,
  Package,
  Booking,
  Payment,
  Notification,
  getAllUsers,
  findUserByEmail,
  findUserById,
  createUser,
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getAllBookings,
  getBookingById,
  createBooking,
  cancelBooking,
  getAllPayments,
  getPaymentByBookingId,
  createPayment,
  getAllNotifications,
  createNotification,
  hasReminder,
  formatPackageOut,
  formatBookingOut,
  getAllReviews,
  createReview,
} from "./src/db/index.js";
import { searchPackagesWithAI } from "./src/ai/search.js";

const __dirname = process.cwd();

const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET || "tourmanager-local-dev-key-change-if-needed";

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Payment Simulation (satisfying SRS FR-02)
function simulatePayment(accountNumber: string): { status: "success" | "failed"; reference: string } {
  const digits = accountNumber.replace(/\D/g, "");
  const nowStr = new Date().toISOString().replace(/\D/g, "").slice(2, 14);
  if (digits.length < 12 || digits.startsWith("0000")) {
    return { status: "failed", reference: `FAIL-${nowStr}` };
  }
  return { status: "success", reference: `PAY-${nowStr}` };
}

// Notification & Trip Reminder helpers (satisfying SRS FR-06 & NFR-04)
async function sendNotification(
  touristId: number,
  ntype: "confirmation" | "receipt" | "reminder",
  subject: string,
  message: string,
  bookingId?: number | null
): Promise<Notification> {
  return createNotification({
    tourist_id: touristId,
    booking_id: bookingId ?? null,
    ntype,
    subject,
    message,
  });
}

async function processTripReminders(tourist?: User | null, days = 7): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);

  const allBookings = await getAllBookings(tourist?.role === "tourist" ? tourist.id : undefined);
  const confirmedBookings = allBookings.filter(b => {
    if (b.status !== "confirmed") return false;
    const bDate = new Date(b.travel_date);
    return bDate >= today && bDate <= cutoff;
  });

  let created = 0;
  for (const b of confirmedBookings) {
    const alreadyReminded = await hasReminder(b.tourist_id, b.id);
    if (alreadyReminded) continue;

    const pkg = await getPackageById(b.package_id);
    await sendNotification(
      b.tourist_id,
      "reminder",
      "Trip reminder",
      `Reminder: booking BK-${b.id} (${pkg?.name || "Trip"} to ${pkg?.destination || "Destination"}) is scheduled for ${b.travel_date}.`,
      b.id
    );
    created++;
  }
  return created;
}

// Authentication Middlewares
interface AuthRequest extends Request {
  user?: User;
}

async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const tokenFromQuery = req.query.token as string | undefined;
  const token = tokenFromHeader || tokenFromQuery;

  if (!token) {
    return res.status(401).json({ detail: "Please log in." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { sub: string; role: string };
    const user = await findUserById(parseInt(decoded.sub, 10));
    if (!user) {
      return res.status(401).json({ detail: "Account not found." });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ detail: "Invalid or expired session." });
  }
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ detail: "Admin access required." });
    }
    next();
  });
}

function requireTourist(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (req.user?.role !== "tourist") {
      return res.status(403).json({ detail: "Tourist access required." });
    }
    next();
  });
}

// Express App
const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// API Routes
// ============================================================================

// Database & System Status (for Supabase verification)
app.get("/api/system/db-status", (_req: Request, res: Response) => {
  res.json(getDatabaseStatus());
});

// Auth Routes (FR-01, NFR-02)
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ detail: "Name must be at least 2 characters." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ detail: "A valid email is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ detail: "Password must be at least 6 characters." });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ detail: "An account with this email already exists." });
    }

    const newUser = await createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: bcrypt.hashSync(password, 10),
      role: "tourist",
    });

    const token = jwt.sign({ sub: String(newUser.id), role: newUser.role }, SECRET_KEY, { expiresIn: "12h" });
    res.json({
      access_token: token,
      token_type: "bearer",
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
    });
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Registration failed." });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    const valid = bcrypt.compareSync(password, user.password_hash) || user.password_hash === password;
    if (!valid) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    const token = jwt.sign({ sub: String(user.id), role: user.role }, SECRET_KEY, { expiresIn: "12h" });
    res.json({
      access_token: token,
      token_type: "bearer",
      role: user.role,
      name: user.name,
      email: user.email,
    });
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Login failed." });
  }
});

app.get("/api/auth/me", authenticateToken, (req: AuthRequest, res: Response) => {
  const u = req.user!;
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
  });
});

// Packages (FR-01)
app.get("/api/packages", async (req: Request, res: Response) => {
  try {
    const destination = ((req.query.destination as string) || "").trim();
    const travelDate = (req.query.travel_date as string) || "";

    const packagesList = await getAllPackages({ destination, travel_date: travelDate });
    const hotels = await getAllHotels();
    const hotelMap = new Map(hotels.map(h => [h.id, h]));

    const out = packagesList.map(p => formatPackageOut(p, hotelMap.get(p.hotel_id)));
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading packages." });
  }
});

app.get("/api/packages/:package_id", async (req: Request, res: Response) => {
  try {
    const pkgId = parseInt(req.params.package_id, 10);
    const pkg = await getPackageById(pkgId);
    if (!pkg) {
      return res.status(404).json({ detail: "Package not found." });
    }
    const hotel = await getHotelById(pkg.hotel_id);
    res.json(formatPackageOut(pkg, hotel));
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading package." });
  }
});

// Reviews API
app.get("/api/packages/:package_id/reviews", async (req: Request, res: Response) => {
  try {
    const pkgId = parseInt(req.params.package_id, 10);
    const reviews = await getAllReviews(pkgId);
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading reviews." });
  }
});

app.post("/api/packages/:package_id/reviews", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const pkgId = parseInt(req.params.package_id, 10);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ detail: "Rating must be between 1 and 5 stars." });
    }
    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ detail: "Please provide a review comment with at least 5 characters." });
    }

    const pkg = await getPackageById(pkgId);
    if (!pkg) {
      return res.status(404).json({ detail: "Package not found." });
    }

    const review = await createReview({
      package_id: pkgId,
      tourist_id: user.id,
      tourist_name: user.name,
      rating: Number(rating),
      comment: comment.trim(),
    });

    res.status(201).json(review);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error submitting review." });
  }
});

app.get("/api/reviews", async (_req: Request, res: Response) => {
  try {
    const reviews = await getAllReviews();
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading reviews." });
  }
});

// Bookings (FR-02, FR-03)
app.post("/api/bookings", requireTourist, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { package_id, payment_method, account_number } = req.body;

    const pkg = await getPackageById(package_id);
    if (!pkg) {
      return res.status(404).json({ detail: "Package not found." });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (pkg.available_date < todayStr) {
      return res.status(400).json({ detail: "Cannot book a package for a past date." });
    }

    const method = (payment_method || "").trim();
    if (method !== "card" && method !== "netbanking") {
      return res.status(400).json({ detail: "Choose a valid payment method." });
    }

    const { status: statusPay, reference } = simulatePayment(account_number || "");
    const requestedAmount = req.body.total_amount ? parseFloat(req.body.total_amount) : NaN;
    const bookingAmount = !isNaN(requestedAmount) && requestedAmount > 0 ? requestedAmount : pkg.price;

    const booking = await createBooking({
      tourist_id: user.id,
      package_id: pkg.id,
      travel_date: pkg.available_date,
      amount: bookingAmount,
      status: statusPay === "success" ? "confirmed" : "failed",
    });

    const payment = await createPayment({
      booking_id: booking.id,
      amount: bookingAmount,
      method,
      status: statusPay,
      reference,
    });

    if (statusPay !== "success") {
      return res.status(400).json({
        detail: "Payment failed. Use a valid account/card number (12+ digits). Numbers starting with 0000 are declined.",
      });
    }

    // Automated notifications (FR-06)
    await sendNotification(
      user.id,
      "confirmation",
      "Booking confirmation",
      `Booking BK-${booking.id} confirmed for ${pkg.name} (${pkg.destination}) on ${pkg.available_date}.`,
      booking.id
    );

    await sendNotification(
      user.id,
      "receipt",
      "Payment receipt",
      `Receipt ${reference}: payment of $${pkg.price.toFixed(2)} received for booking BK-${booking.id}.`,
      booking.id
    );

    await processTripReminders(user);

    const hotel = await getHotelById(pkg.hotel_id);
    res.json(formatBookingOut(booking, pkg, hotel, payment, user));
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Booking creation failed." });
  }
});

app.get("/api/bookings/me", requireTourist, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const userBookings = await getAllBookings(user.id);
    const packagesList = await getAllPackages();
    const hotels = await getAllHotels();
    const payments = await getAllPayments();

    const pkgMap = new Map(packagesList.map(p => [p.id, p]));
    const hotelMap = new Map(hotels.map(h => [h.id, h]));
    const payMap = new Map(payments.map(p => [p.booking_id, p]));

    const out = userBookings.map(b => {
      const p = pkgMap.get(b.package_id);
      const h = p ? hotelMap.get(p.hotel_id) : null;
      const pay = payMap.get(b.id);
      return formatBookingOut(b, p, h, pay, user);
    });

    res.json(out);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading bookings." });
  }
});

app.post("/api/bookings/:booking_id/cancel", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.booking_id, 10);
    const user = req.user!;

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ detail: "Booking not found." });
    }

    if (user.role === "tourist" && booking.tourist_id !== user.id) {
      return res.status(403).json({ detail: "You can only cancel your own bookings." });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ detail: "This booking is already cancelled." });
    }

    const updated = await cancelBooking(bookingId);
    await sendNotification(
      booking.tourist_id,
      "confirmation",
      "Booking cancelled",
      `Booking BK-${booking.id} has been cancelled.`,
      booking.id
    );

    const pkg = await getPackageById(booking.package_id);
    const hotel = pkg ? await getHotelById(pkg.hotel_id) : null;
    const pay = await getPaymentByBookingId(booking.id);
    res.json(formatBookingOut(updated!, pkg, hotel, pay, user));
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Cancellation failed." });
  }
});

app.get("/api/bookings/:booking_id/ticket", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.booking_id, 10);
    const user = req.user!;

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ detail: "Booking not found." });
    }

    if (user.role === "tourist" && booking.tourist_id !== user.id) {
      return res.status(403).json({ detail: "You can only download your own tickets." });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({ detail: "Tickets are available only for confirmed bookings." });
    }

    const pkg = await getPackageById(booking.package_id);
    const hotel = pkg ? await getHotelById(pkg.hotel_id) : null;
    const pay = await getPaymentByBookingId(booking.id);
    const tourist = await findUserById(booking.tourist_id);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket BK-${booking.id}</title>
<style>
body { font-family: Segoe UI, Arial, sans-serif; padding: 32px; color: #0f172a; }
.ticket { border: 2px dashed #0f766e; border-radius: 16px; padding: 28px; max-width: 640px; }
h1 { margin: 0 0 8px; color: #0f766e; }
p { margin: 6px 0; }
</style></head><body>
<div class="ticket">
<h1>TourManager Ticket</h1>
<p><strong>Booking:</strong> BK-${booking.id}</p>
<p><strong>Traveler:</strong> ${tourist ? tourist.name : ""} (${tourist ? tourist.email : ""})</p>
<p><strong>Package:</strong> ${pkg ? pkg.name : ""}</p>
<p><strong>Destination:</strong> ${pkg ? pkg.destination : ""}</p>
<p><strong>Hotel:</strong> ${hotel ? hotel.name : "-"}</p>
<p><strong>Travel date:</strong> ${booking.travel_date}</p>
<p><strong>Amount paid:</strong> $${booking.amount.toFixed(2)}</p>
<p><strong>Payment:</strong> ${pay ? pay.reference : "-"} (${pay ? pay.status : "-"})</p>
<p><strong>Status:</strong> ${booking.status}</p>
</div>
</body></html>`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="ticket-BK-${booking.id}.html"`);
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error generating ticket." });
  }
});

// Notifications (FR-06)
app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    await processTripReminders(user.role === "tourist" ? user : null);

    const list = await getAllNotifications(user.role === "tourist" ? user.id : undefined);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error retrieving notifications." });
  }
});

// Admin Dashboard & Management (FR-04, FR-05)
app.get("/api/admin/dashboard", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const packagesList = await getAllPackages();
    const hotels = await getAllHotels();
    const allUsers = await getAllUsers();
    const allBookings = await getAllBookings();
    const allPayments = await getAllPayments();

    let totalPayments = 0;
    let successfulPayments = 0;
    let failedPayments = 0;

    if (user.role === "admin") {
      const active = allBookings.filter(b => b.status === "confirmed").length;
      const cancelled = allBookings.filter(b => b.status === "cancelled").length;
      const touristCount = allUsers.filter(u => u.role === "tourist").length;

      for (const p of allPayments) {
        if (p.status === "success") {
          totalPayments += p.amount;
          successfulPayments++;
        } else {
          failedPayments++;
        }
      }

      return res.json({
        packages: packagesList.length,
        hotels: hotels.length,
        active_bookings: active,
        cancelled_bookings: cancelled,
        tourists: touristCount,
        payments_total: totalPayments,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
      });
    } else {
      const userBookings = allBookings.filter(b => b.tourist_id === user.id);
      const userBookingIds = new Set(userBookings.map(b => b.id));
      const active = userBookings.filter(b => b.status === "confirmed").length;
      const cancelled = userBookings.filter(b => b.status === "cancelled").length;

      for (const p of allPayments) {
        if (userBookingIds.has(p.booking_id)) {
          if (p.status === "success") {
            totalPayments += p.amount;
            successfulPayments++;
          } else {
            failedPayments++;
          }
        }
      }

      return res.json({
        packages: packagesList.length,
        hotels: hotels.length,
        active_bookings: active,
        cancelled_bookings: cancelled,
        tourists: 1,
        payments_total: totalPayments,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
      });
    }
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading dashboard metrics." });
  }
});

// Admin Hotels (FR-04)
app.get("/api/admin/hotels", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const hotels = await getAllHotels();
    hotels.sort((a, b) => a.name.localeCompare(b.name));
    res.json(hotels);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading hotels." });
  }
});

app.post("/api/admin/hotels", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, location, description } = req.body;
    if (!name || name.trim().length < 2 || !location || location.trim().length < 2) {
      return res.status(400).json({ detail: "Name and location must be at least 2 characters." });
    }

    const hotel = await createHotel({
      name: name.trim(),
      location: location.trim(),
      description: description || "",
    });
    res.json(hotel);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Failed to create hotel." });
  }
});

app.put("/api/admin/hotels/:hotel_id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const hotelId = parseInt(req.params.hotel_id, 10);
    const updated = await updateHotel(hotelId, req.body);
    if (!updated) {
      return res.status(404).json({ detail: "Hotel not found." });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Failed to update hotel." });
  }
});

app.delete("/api/admin/hotels/:hotel_id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const hotelId = parseInt(req.params.hotel_id, 10);
    const existing = await getHotelById(hotelId);
    if (!existing) {
      return res.status(404).json({ detail: "Hotel not found." });
    }

    const packagesList = await getAllPackages();
    const linked = packagesList.filter(p => p.hotel_id === hotelId);
    if (linked.length > 0) {
      return res.status(400).json({ detail: "Cannot delete a hotel that is assigned to packages." });
    }

    await deleteHotel(hotelId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Failed to delete hotel." });
  }
});

// Admin Packages (FR-04)
app.get("/api/admin/packages", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const packagesList = await getAllPackages();
    const hotels = await getAllHotels();
    const hotelMap = new Map(hotels.map(h => [h.id, h]));

    packagesList.sort((a, b) => a.available_date.localeCompare(b.available_date));
    res.json(packagesList.map(p => formatPackageOut(p, hotelMap.get(p.hotel_id))));
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading packages." });
  }
});

app.post("/api/admin/packages", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, destination, hotel_id, price, available_date, image_url, description } = req.body;
    const hotel = await getHotelById(hotel_id);
    if (!hotel) {
      return res.status(400).json({ detail: "Select a valid hotel." });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (available_date < todayStr) {
      return res.status(400).json({ detail: "Cannot create a package for a past date." });
    }

    const pkg = await createPackage({
      name: name.trim(),
      destination: destination.trim(),
      hotel_id,
      price: Number(price),
      available_date,
      image_url: image_url || "",
      description: description || "",
    });

    res.json(formatPackageOut(pkg, hotel));
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Failed to create package." });
  }
});

app.put("/api/admin/packages/:package_id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.package_id, 10);
    const existing = await getPackageById(packageId);
    if (!existing) {
      return res.status(404).json({ detail: "Package not found." });
    }

    const { name, destination, hotel_id, price, available_date, image_url, description } = req.body;
    if (hotel_id !== undefined) {
      const hotel = await getHotelById(hotel_id);
      if (!hotel) return res.status(400).json({ detail: "Select a valid hotel." });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (available_date !== undefined && available_date < todayStr) {
      return res.status(400).json({ detail: "Cannot update a package to a past date." });
    }

    const updated = await updatePackage(packageId, {
      name,
      destination,
      hotel_id,
      price: price !== undefined ? Number(price) : undefined,
      available_date,
      image_url,
      description,
    });

    const hotel = await getHotelById(updated!.hotel_id);
    res.json(formatPackageOut(updated!, hotel));
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Failed to update package." });
  }
});

app.put("/api/admin/packages/:package_id/price", requireAdmin, async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.package_id, 10);
    const { price } = req.body;
    if (price === undefined || Number(price) <= 0) {
      return res.status(400).json({ detail: "A valid positive price is required." });
    }

    const updated = await updatePackage(packageId, { price: Number(price) });
    if (!updated) {
      return res.status(404).json({ detail: "Package not found." });
    }

    const hotel = await getHotelById(updated.hotel_id);
    res.json(formatPackageOut(updated, hotel));
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Failed to update package price." });
  }
});

app.delete("/api/admin/packages/:package_id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.package_id, 10);
    const existing = await getPackageById(packageId);
    if (!existing) {
      return res.status(404).json({ detail: "Package not found." });
    }

    const allBookings = await getAllBookings();
    const linked = allBookings.filter(b => b.package_id === packageId);
    if (linked.length > 0) {
      return res.status(400).json({ detail: "Cannot delete a package that has bookings." });
    }

    await deletePackage(packageId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Failed to delete package." });
  }
});

// Admin Oversight (FR-05)
app.get("/api/admin/bookings", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allBookings = await getAllBookings();
    const packagesList = await getAllPackages();
    const hotels = await getAllHotels();
    const payments = await getAllPayments();
    const users = await getAllUsers();

    const pkgMap = new Map(packagesList.map(p => [p.id, p]));
    const hotelMap = new Map(hotels.map(h => [h.id, h]));
    const payMap = new Map(payments.map(p => [p.booking_id, p]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const out = allBookings.map(b => {
      const p = pkgMap.get(b.package_id);
      const h = p ? hotelMap.get(p.hotel_id) : null;
      const pay = payMap.get(b.id);
      const tourist = userMap.get(b.tourist_id);
      return formatBookingOut(b, p, h, pay, tourist);
    });

    res.json(out);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading bookings." });
  }
});

app.get("/api/admin/tourists", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    const tourists = users
      .filter(u => u.role === "tourist")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
      }));
    res.json(tourists);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading tourists." });
  }
});

app.get("/api/admin/payments", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const payments = await getAllPayments();
    const bookings = await getAllBookings();
    const users = await getAllUsers();

    const bookingMap = new Map(bookings.map(b => [b.id, b]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const out = payments.map(p => {
      const booking = bookingMap.get(p.booking_id);
      const tourist = booking ? userMap.get(booking.tourist_id) : null;
      return {
        id: p.id,
        booking_id: p.booking_id,
        tourist_email: tourist ? tourist.email : "",
        amount: p.amount,
        method: p.method,
        status: p.status,
        reference: p.reference,
        created_at: p.created_at,
      };
    });
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || "Error loading payments." });
  }
});

// Fallback response for AI Assistant
async function generateFallbackResponse(message: string): Promise<string> {
  const lower = message.toLowerCase();
  const packagesList = await getAllPackages();
  const hotels = await getAllHotels();
  const hotelMap = new Map(hotels.map(h => [h.id, h]));

  let matched = packagesList.filter(p => {
    const destTokens = p.destination.toLowerCase().split(/[,\s]+/).filter(t => t.length > 2);
    const matchesDest = destTokens.some(t => lower.includes(t));
    const nameTokens = p.name.toLowerCase().split(/[\s]+/).filter(t => t.length > 3);
    const matchesName = nameTokens.some(t => lower.includes(t));
    const fullDest = p.destination.toLowerCase();
    return matchesDest || matchesName || lower.includes(fullDest);
  });

  if (matched.length === 0) {
    if (
      lower.includes("budget") ||
      lower.includes("cheap") ||
      lower.includes("affordable") ||
      lower.includes("under") ||
      lower.includes("1500") ||
      lower.includes("1000") ||
      lower.includes("1200")
    ) {
      matched = [...packagesList].sort((a, b) => a.price - b.price).slice(0, 3);
    } else if (
      lower.includes("beach") ||
      lower.includes("island") ||
      lower.includes("ocean") ||
      lower.includes("sea") ||
      lower.includes("tropical")
    ) {
      matched = packagesList.filter(p =>
        ["Maldives", "Amalfi, Italy", "Santorini, Greece", "Bali, Indonesia"].includes(p.destination)
      );
    } else if (
      lower.includes("history") ||
      lower.includes("culture") ||
      lower.includes("temple") ||
      lower.includes("pyramid") ||
      lower.includes("ancient")
    ) {
      matched = packagesList.filter(p =>
        ["Rome", "Kyoto, Japan", "Cairo, Egypt", "Barcelona, Spain"].includes(p.destination)
      );
    } else if (
      lower.includes("winter") ||
      lower.includes("snow") ||
      lower.includes("mountain") ||
      lower.includes("aurora") ||
      lower.includes("lights") ||
      lower.includes("glacier")
    ) {
      matched = packagesList.filter(p => ["Switzerland", "Reykjavik, Iceland"].includes(p.destination));
    } else if (
      lower.includes("city") ||
      lower.includes("modern") ||
      lower.includes("shopping") ||
      lower.includes("skyline") ||
      lower.includes("broadway")
    ) {
      matched = packagesList.filter(p =>
        ["Singapore", "Tokyo, Japan", "Dubai, UAE", "New York, USA"].includes(p.destination)
      );
    } else if (lower.includes("romantic") || lower.includes("honeymoon") || lower.includes("couple")) {
      matched = packagesList.filter(p =>
        ["Paris, France", "Santorini, Greece", "Maldives", "Amalfi, Italy"].includes(p.destination)
      );
    } else {
      matched = packagesList.slice(0, 3);
    }
  }

  const recs = matched
    .map(p => {
      const h = hotelMap.get(p.hotel_id);
      return `• **${p.name}** (${p.destination}) - **$${p.price.toFixed(2)}** at *${h?.name || "Luxury Resort"}*\n  ${p.description}`;
    })
    .join("\n\n");

  return `Hello traveler! 🌍 Here are recommendations tailored for you from our 16 destinations:\n\n${recs}\n\n*Tip: Click any package or destination pill to view details and book directly!*`;
}

// AI Travel Assistant
app.post("/api/ai/assistant", async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ detail: "A valid message is required." });
    }

    const packagesList = await getAllPackages();
    const hotels = await getAllHotels();
    const hotelMap = new Map(hotels.map(h => [h.id, h]));

    const availablePackages = packagesList
      .map(p => {
        const h = hotelMap.get(p.hotel_id);
        return `- "${p.name}" in ${p.destination} (Hotel: ${h?.name || "Hotel"}), Price: $${p.price}, Travel Date: ${p.available_date}. Details: ${p.description}`;
      })
      .join("\n");

    const systemInstruction = `You are TourGuide AI, an intelligent, inspiring, and expert travel concierge for the Tourist Management System.
You assist travelers with destination ideas, travel itineraries, budget recommendations, weather tips, and package recommendations.
Current Available Tour Packages in the catalog:
${availablePackages}

Rules:
1. Always be welcoming, knowledgeable, and concise (2-4 clear paragraphs or bullet points).
2. When answering destination or itinerary questions, reference the matching packages available in our catalog with their exact package names and prices ($) so users can easily find and book them in the platform.
3. If asked about a destination that is not currently in our catalog, offer expert general travel tips, then suggest the closest or most popular alternative from our current packages.
4. Format output with clean markdown (bolding, lists) for high readability.`;

    const ai = getGenAI();
    if (ai) {
      try {
        const promptContents: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
          for (const item of history.slice(-6)) {
            if (item && item.text) {
              promptContents.push({
                role: item.role === "model" ? "model" : "user",
                parts: [{ text: String(item.text) }],
              });
            }
          }
        }
        promptContents.push({
          role: "user",
          parts: [{ text: message.trim() }],
        });

        const geminiCall = ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: promptContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        }).then(res => res.text).catch(err => {
          console.warn("Gemini call failed:", err?.message || err);
          return null;
        });

        const timeoutCall = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const resolvedText = await Promise.race([geminiCall, timeoutCall]);

        const reply = resolvedText || (await generateFallbackResponse(message));
        return res.json({ reply });
      } catch (genErr: any) {
        console.warn("Gemini generation error, utilizing smart concierge fallback:", genErr?.message || genErr);
        const reply = await generateFallbackResponse(message);
        return res.json({ reply });
      }
    } else {
      const reply = await generateFallbackResponse(message);
      return res.json({ reply });
    }
  } catch (err: any) {
    console.error("AI Assistant general error:", err);
    const reply = await generateFallbackResponse(req.body?.message || "travel");
    return res.json({ reply });
  }
});

// AI Natural Language Search & Record Matcher
app.post("/api/ai/search", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ detail: "A valid natural language search query is required." });
    }
    const result = await searchPackagesWithAI(query.trim());
    return res.json(result);
  } catch (err: any) {
    console.error("AI Search Error:", err);
    return res.status(500).json({ detail: err?.message || "AI search encountered an unexpected error." });
  }
});

// Static Files & Web Entry
const staticDir = path.join(__dirname, "static");
app.use("/static", express.static(staticDir));

// Route "/" serves the primary application
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.use(express.static(__dirname));

// Initialize Supabase & Launch Server
initSupabase().then(connected => {
  if (connected) {
    console.log("Supabase PostgreSQL active & synced.");
  } else {
    console.log("Running on local high-performance store, primed for Supabase integration.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Tourist Management System server running on http://0.0.0.0:${PORT}`);
});
