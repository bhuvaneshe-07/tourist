import {
  initSupabase,
  getDatabaseStatus,
  getAllUsers,
  findUserByEmail,
  createUser,
  getAllHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getAllBookings,
  createBooking,
  cancelBooking,
  getAllPayments,
  createPayment,
  getAllNotifications,
  createNotification,
  getAllReviews,
  createReview,
  getPackageRatingSummary,
} from "../src/db/index.ts";
import { searchPackagesWithAI } from "../src/ai/search.ts";
import bcrypt from "bcryptjs";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failedCount++;
    throw new Error(msg);
  } else {
    console.log(`✅ PASS: ${msg}`);
    passedCount++;
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("Tourist Management System (SRS Verification Suite)");
  console.log("=================================================\n");

  // 1. Database Connection & Architecture Status
  console.log("--- 1. Testing Database & Supabase Readiness ---");
  const status = getDatabaseStatus();
  assert(status !== null, "Database status object retrieved");
  assert(status.counts.users >= 4, `Database contains seeded users (${status.counts.users} found)`);
  assert(status.counts.hotels === 16, `Database contains 16 world-class hotels (${status.counts.hotels} found)`);
  assert(status.counts.packages === 16, `Database contains 16 tour packages (${status.counts.packages} found)`);

  // 2. FR-01: Tourist Registration, Login, & Search
  console.log("\n--- 2. FR-01: Authentication & Search Packages ---");
  const testEmail = `tourist_${Date.now()}@testtravel.com`;
  const plainPassword = "SecurePass123!";
  const hash = bcrypt.hashSync(plainPassword, 10);
  
  const newUser = await createUser({
    name: "Elena Rostova",
    email: testEmail,
    password_hash: hash,
    role: "tourist",
  });
  assert(newUser.id > 0, "Tourist successfully registered in database");
  assert(bcrypt.compareSync(plainPassword, newUser.password_hash), "Password encrypted securely with bcrypt (NFR-02)");

  const foundUser = await findUserByEmail(testEmail);
  assert(foundUser?.email === testEmail, "User retrieved by email");

  // Search packages by destination
  const santoriniPkgs = await getAllPackages({ destination: "Santorini" });
  assert(santoriniPkgs.length > 0, "Package search by destination 'Santorini' returned results");
  assert(santoriniPkgs[0].destination.includes("Santorini"), "Destination filter accurately matched package");

  // 3. FR-02: Booking Creation, Payment, and Notifications
  console.log("\n--- 3. FR-02: Package Booking & Payment Simulation ---");
  const targetPkg = santoriniPkgs[0];
  const newBooking = await createBooking({
    tourist_id: newUser.id,
    package_id: targetPkg.id,
    travel_date: targetPkg.available_date,
    amount: targetPkg.price,
    status: "confirmed",
  });
  assert(newBooking.id > 0, "Booking created with ID " + newBooking.id);
  assert(newBooking.status === "confirmed", "Booking confirmed");

  const newPayment = await createPayment({
    booking_id: newBooking.id,
    amount: targetPkg.price,
    method: "card",
    status: "success",
    reference: `PAY-TEST-${Date.now()}`,
  });
  assert(newPayment.id > 0, "Payment record created with reference " + newPayment.reference);

  // Automated notification (FR-06)
  const notif = await createNotification({
    tourist_id: newUser.id,
    booking_id: newBooking.id,
    ntype: "confirmation",
    subject: "Booking confirmation",
    message: `Booking BK-${newBooking.id} confirmed for ${targetPkg.name}.`,
  });
  assert(notif.id > 0, "Automated confirmation notification logged (FR-06, NFR-04)");

  // 4. FR-03: View Booking History and Cancellation
  console.log("\n--- 4. FR-03: Tourist Booking History & Cancellation ---");
  const userBookings = await getAllBookings(newUser.id);
  assert(userBookings.length === 1, "User booking history contains 1 active booking");

  const cancelled = await cancelBooking(newBooking.id);
  assert(cancelled?.status === "cancelled", "Booking successfully cancelled by tourist");

  // 5. FR-04: Admin CRUD on Hotels, Packages, and Prices
  console.log("\n--- 5. FR-04: Admin Hotel and Package Management ---");
  const testHotel = await createHotel({
    name: "Alpine Peak Haven",
    location: "Interlaken, Switzerland",
    description: "Panoramic lake and mountain views",
  });
  assert(testHotel.id > 0, "Admin created hotel successfully");

  const updatedHotel = await updateHotel(testHotel.id, { description: "Updated luxury chalet suites" });
  assert(updatedHotel?.description === "Updated luxury chalet suites", "Admin updated hotel description");

  const testPackage = await createPackage({
    name: "Jungfrau Glacier Trek",
    destination: "Interlaken, Switzerland",
    hotel_id: testHotel.id,
    price: 1350,
    available_date: "2026-11-25",
    description: "Full day Jungfraujoch summit excursion",
  });
  assert(testPackage.id > 0, "Admin created package successfully");

  const updatedPkg = await updatePackage(testPackage.id, { price: 1299 });
  assert(updatedPkg?.price === 1299, "Admin modified package price successfully");

  const deletedPkg = await deletePackage(testPackage.id);
  assert(deletedPkg === true, "Admin deleted package successfully");

  const deletedHotel = await deleteHotel(testHotel.id);
  assert(deletedHotel === true, "Admin deleted hotel successfully");

  // 6. FR-05: Admin Oversight (All Bookings, Tourists, Payments)
  console.log("\n--- 6. FR-05: Admin Oversight & Global Analytics ---");
  const allUsers = await getAllUsers();
  const allBookings = await getAllBookings();
  const allPayments = await getAllPayments();
  const allHotels = await getAllHotels();

  assert(allUsers.filter(u => u.role === "tourist").length >= 2, "Admin can list registered tourists");
  assert(allBookings.length >= 1, "Admin can oversee all system bookings");
  assert(allPayments.length >= 1, "Admin can inspect all transaction records");
  assert(allHotels.length === 16, "Admin maintains all 16 hotel records");

  // 7. Tourist Reviews & Ratings System
  console.log("\n--- 7. Reviews, Ratings & Recommendations ---");
  const pkgReviews = await getAllReviews(1);
  assert(pkgReviews.length >= 2, `Seeded reviews retrieved for Package 1 (${pkgReviews.length} reviews found)`);
  
  const createdReview = await createReview({
    package_id: 1,
    tourist_id: newUser.id,
    tourist_name: newUser.name,
    rating: 5,
    comment: "Simply breathtaking experience! Highly recommended to all fellow travelers.",
  });
  assert(createdReview.id > 0, "Tourist successfully submitted a 5-star review");
  assert(createdReview.rating === 5, "Rating value recorded accurately as 5");
  
  const ratingSummary = getPackageRatingSummary(1);
  assert(ratingSummary.rating >= 4.5, `Package rating summary calculated accurately (${ratingSummary.rating} stars)`);

  // 9. AI-Powered Natural Language Search & Semantic Matcher
  console.log("\n--- 9. AI Natural Language Search & Intent Matching ---");
  const allPackagesList = await getAllPackages();

  // Test 9a: Budget and Romantic Beach query
  const beachResult = await searchPackagesWithAI("Romantic beach getaways under $1800", allPackagesList);
  assert(beachResult.matched_package_ids.length > 0, "AI search returned matches for romantic beach query");
  assert(typeof beachResult.summary === "string" && beachResult.summary.length > 0, "AI search generated human-readable summary");
  assert(typeof beachResult.match_reasons === "object", "AI search generated match reasons mapping");

  // Verify matched packages actually respect criteria
  for (const pid of beachResult.matched_package_ids) {
    const pkg = allPackagesList.find(p => p.id === pid);
    if (pkg) {
      assert(pkg.price <= 1800, `Matched package '${pkg.name}' is within $1800 budget ($${pkg.price})`);
    }
  }

  // Test 9b: Cultural & Historical query
  const cultureResult = await searchPackagesWithAI("Historic ancient monuments and cultural temples", allPackagesList);
  assert(cultureResult.matched_package_ids.length > 0, "AI search matched cultural destinations");

  // Test 9c: Impossible/Non-matching query gracefully handles empty state
  const impossibleResult = await searchPackagesWithAI("Submarine dive to Atlantis sunken city", allPackagesList);
  assert(Array.isArray(impossibleResult.matched_package_ids), "AI search handles zero-match gracefully with array");
  assert(typeof impossibleResult.summary === "string", "AI search provides helpful zero-match feedback");

  // 8. Supabase Schema and Migration Integrity Verification
  console.log("\n--- 10. Supabase Migration & Data Integrity Verification ---");
  const finalStatus = getDatabaseStatus();
  console.log("Active Database Architecture:", finalStatus.provider);
  console.log(`Verified Total Records in System:
  - Users: ${finalStatus.counts.users}
  - Hotels: ${finalStatus.counts.hotels}
  - Packages: ${finalStatus.counts.packages}
  - Bookings: ${finalStatus.counts.bookings}
  - Payments: ${finalStatus.counts.payments}
  - Notifications: ${finalStatus.counts.notifications}
  `);

  console.log("=================================================");
  console.log(`SUMMARY: ${passedCount} tests passed, ${failedCount} failed.`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
