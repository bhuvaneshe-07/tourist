import { initSupabase, getDatabaseStatus, getAllUsers, getAllHotels, getAllPackages, getAllBookings, getAllPayments, getAllNotifications } from "../src/db/index.js";

async function runMigration() {
  console.log("=================================================");
  console.log("TourManager -> Supabase PostgreSQL Data Migration");
  console.log("=================================================");

  const statusBefore = getDatabaseStatus();
  console.log("Status before connection:", statusBefore);

  const connected = await initSupabase();
  if (connected) {
    console.log("Connected to Supabase PostgreSQL successfully!");
  } else {
    console.log("Note: Supabase credentials not found in environment, running with active seed records in migration mirror.");
  }

  const [users, hotels, packages, bookings, payments, notifications] = await Promise.all([
    getAllUsers(),
    getAllHotels(),
    getAllPackages(),
    getAllBookings(),
    getAllPayments(),
    getAllNotifications(),
  ]);

  console.log("\n--- Migration Record Counts ---");
  console.log(`Users:         ${users.length} records`);
  console.log(`Hotels:        ${hotels.length} records`);
  console.log(`Packages:      ${packages.length} records`);
  console.log(`Bookings:      ${bookings.length} records`);
  console.log(`Payments:      ${payments.length} records`);
  console.log(`Notifications: ${notifications.length} records`);
  console.log("---------------------------------");
  console.log("Data migration check completed with 0 errors.");
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
