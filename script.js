// Application State
let currentRole = 'tourist';
let packages = [
    {
        id: 'PKG-101',
        name: 'Alpine Wonders & Ski Resort',
        destination: 'Swiss Alps, Switzerland',
        description: 'Experience world-class skiing, cozy mountain chalets, and breathtaking views of the Matterhorn.',
        hotel: 'Grand Swiss Alpine Lodge',
        price: 1200,
        downpayment: 300,
        image: 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=600&q=80',
        date: '2026-11-15'
    },
    {
        id: 'PKG-102',
        name: 'Tropical Paradise Escape',
        destination: 'Bali, Indonesia',
        description: 'Serene beach villas, ancient temple tours, and lush rainforest wellness retreats.',
        hotel: 'Ubud Ocean Resort & Spa',
        price: 850,
        downpayment: 200,
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
        date: '2026-10-05'
    },
    {
        id: 'PKG-103',
        name: 'Neon Horizon & Imperial Trails',
        destination: 'Tokyo, Japan',
        description: 'Immerse yourself in bustling street markets, historic shrines, and high-tech urban culture.',
        hotel: 'Shinjuku Luxury Tower',
        price: 1450,
        downpayment: 400,
        image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
        date: '2026-12-01'
    }
];

let bookings = [
    {
        id: 'BK-9081',
        touristEmail: 'tourist@example.com',
        packageId: 'PKG-102',
        packageName: 'Tropical Paradise Escape',
        destination: 'Bali, Indonesia',
        date: '2026-10-05',
        totalPrice: 850,
        paidAmount: 200,
        status: 'Partial (Down-Payment)'
    }
];

let tourists = [
    { email: 'tourist@example.com', joined: '2026-01-10', bookingsCount: 1 }
];

let payments = [
    { id: 'PAY-301', bookingId: 'BK-9081', amount: 200, method: 'Credit Card', date: '2026-02-14' }
];

let notifications = [
    { message: 'System initialization complete.', time: 'Just now' },
    { message: 'Down-payment of $200 received for Booking #BK-9081', time: '10 mins ago' }
];

let chartInstance = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderPackages();
    renderUserBookings();
    renderNotifications();
    updateMetrics();
    initChart();
});

// Navigation Controller
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (target) {
                switchSection(target);
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active-section');
        const titleMap = {
            'dashboard-section': 'Dashboard Overview',
            'search-section': 'Explore Tour Packages',
            'my-bookings-section': 'My Bookings History',
            'inventory-section': 'Manage Inventory',
            'admin-oversight-section': 'Admin Oversight',
            'notifications-section': 'System Notifications'
        };
        document.getElementById('page-title').textContent = titleMap[sectionId] || 'Dashboard Overview';
    }
}

// Role Switching
function switchRole(role) {
    currentRole = role;
    document.getElementById('role-label-text').textContent = role === 'admin' ? 'Administrator' : 'Tourist';
    if (role === 'admin') {
        document.body.classList.add('role-admin');
        renderAdminTable('all-bookings');
    } else {
        document.body.classList.remove('role-admin');
    }
    updateMetrics();
}

// Separate Authentication Modals Logic
function openAuthModal(portalType) {
    if (portalType === 'admin') {
        document.getElementById('admin-auth-modal').style.display = 'flex';
    } else {
        document.getElementById('tourist-auth-modal').style.display = 'flex';
    }
}

function handleAuth(event, portalType) {
    event.preventDefault();
    if (portalType === 'admin') {
        const email = document.getElementById('admin-email').value;
        switchRole('admin');
        document.getElementById('role-select').value = 'admin';
        closeModal('admin-auth-modal');
        pushNotification(`Admin user (${email}) logged into administrative portal.`);
    } else {
        const email = document.getElementById('tourist-email').value;
        switchRole('tourist');
        document.getElementById('role-select').value = 'tourist';
        if (!tourists.find(t => t.email === email)) {
            tourists.push({ email, joined: new Date().toISOString().split('T')[0], bookingsCount: 0 });
        }
        closeModal('tourist-auth-modal');
        pushNotification(`Tourist user (${email}) logged into tourist portal.`);
    }
}

// Package Rendering & Filtering
function renderPackages(itemsToRender = packages) {
    const container = document.getElementById('package-grid-container');
    container.innerHTML = '';

    if (itemsToRender.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No packages found matching your criteria.</p>';
        return;
    }

    itemsToRender.forEach(pkg => {
        const card = document.createElement('div');
        card.className = 'package-card';
        card.innerHTML = `
            <div class="package-img" style="background-image: url('${pkg.image}')">
                <span class="package-price-tag">$${pkg.price}</span>
            </div>
            <div class="package-details">
                <h3>${pkg.name}</h3>
                <p class="package-location"><i class="fa-solid fa-location-dot"></i> ${pkg.destination}</p>
                <p class="package-desc">${pkg.description}</p>
                <div class="package-footer">
                    <span style="font-size: 11px; color: var(--text-secondary);"><i class="fa-solid fa-hotel"></i> ${pkg.hotel}</span>
                    <button class="btn btn-primary" onclick="openBookingModal('${pkg.id}')">Book Now</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterPackages() {
    const dest = document.getElementById('search-dest').value.toLowerCase();
    const date = document.getElementById('search-date').value;

    const filtered = packages.filter(pkg => {
        const matchesDest = pkg.destination.toLowerCase().includes(dest) || pkg.name.toLowerCase().includes(dest);
        const matchesDate = !date || pkg.date === date;
        return matchesDest && matchesDate;
    });

    renderPackages(filtered);
}

function resetSearch() {
    document.getElementById('search-dest').value = '';
    document.getElementById('search-date').value = '';
    renderPackages();
}

function quickSearch() {
    const dest = document.getElementById('quick-dest-input').value;
    const date = document.getElementById('quick-date-input').value;
    document.getElementById('search-dest').value = dest;
    document.getElementById('search-date').value = date;
    switchSection('search-section');
    filterPackages();
}

function filterByDestination(destName) {
    document.getElementById('search-dest').value = destName;
    switchSection('search-section');
    filterPackages();
}

// Booking Management
let activeBookingPkg = null;

function openBookingModal(pkgId) {
    activeBookingPkg = packages.find(p => p.id === pkgId);
    if (!activeBookingPkg) return;

    const summary = document.getElementById('booking-summary-details');
    summary.innerHTML = `
        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
            <p><strong>Package:</strong> ${activeBookingPkg.name}</p>
            <p><strong>Total Cost:</strong> $${activeBookingPkg.price}</p>
            <p><strong>Min Down-Payment:</strong> $${activeBookingPkg.downpayment}</p>
        </div>
    `;

    document.getElementById('payment-type-select').value = 'full';
    togglePaymentAmountInput();
    document.getElementById('booking-modal').style.display = 'flex';
}

function togglePaymentAmountInput() {
    const type = document.getElementById('payment-type-select').value;
    const input = document.getElementById('pay-amount-input');
    const hint = document.getElementById('pay-amount-hint');

    if (!activeBookingPkg) return;

    if (type === 'full') {
        input.value = activeBookingPkg.price;
        input.readOnly = true;
        hint.textContent = 'Full package amount required.';
    } else {
        input.value = activeBookingPkg.downpayment;
        input.readOnly = false;
        input.min = activeBookingPkg.downpayment;
        input.max = activeBookingPkg.price;
        hint.textContent = `Minimum required: $${activeBookingPkg.downpayment}`;
    }
}

function processBookingPayment(e) {
    e.preventDefault();
    const payAmount = parseFloat(document.getElementById('pay-amount-input').value);
    const bookingId = 'BK-' + Math.floor(1000 + Math.random() * 9000);

    const isFull = payAmount >= activeBookingPkg.price;
    const newBooking = {
        id: bookingId,
        touristEmail: 'tourist@example.com',
        packageId: activeBookingPkg.id,
        packageName: activeBookingPkg.name,
        destination: activeBookingPkg.destination,
        date: activeBookingPkg.date,
        totalPrice: activeBookingPkg.price,
        paidAmount: payAmount,
        status: isFull ? 'Confirmed (Paid)' : 'Partial (Down-Payment)'
    };

    bookings.push(newBooking);
    payments.push({
        id: 'PAY-' + Math.floor(100 + Math.random() * 900),
        bookingId: bookingId,
        amount: payAmount,
        method: 'Card',
        date: new Date().toISOString().split('T')[0]
    });

    pushNotification(`Booking ${bookingId} created. Payment received: $${payAmount}`);
    closeModal('booking-modal');
    renderUserBookings();
    updateMetrics();
    alert('Booking and payment successful!');
}

function renderUserBookings() {
    const tbody = document.getElementById('user-bookings-tbody');
    tbody.innerHTML = '';

    bookings.forEach(b => {
        const due = b.totalPrice - b.paidAmount;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${b.id}</strong></td>
            <td>${b.packageName}</td>
            <td>${b.destination}</td>
            <td>${b.date}</td>
            <td>$${b.totalPrice}</td>
            <td>$${b.paidAmount}</td>
            <td style="color: ${due > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'}">$${due}</td>
            <td><span class="badge">${b.status}</span></td>
            <td>
                ${due > 0 ? `<button class="btn btn-secondary" onclick="payRemaining('${b.id}', ${due})" style="padding: 4px 8px; font-size: 11px;">Pay Due</button>` : 'Fully Paid'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function payRemaining(bookingId, dueAmount) {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
        booking.paidAmount += dueAmount;
        booking.status = 'Confirmed (Paid)';
        payments.push({
            id: 'PAY-' + Math.floor(100 + Math.random() * 900),
            bookingId: bookingId,
            amount: dueAmount,
            method: 'Card',
            date: new Date().toISOString().split('T')[0]
        });
        pushNotification(`Remaining due of $${dueAmount} cleared for Booking ${bookingId}`);
        renderUserBookings();
        updateMetrics();
    }
}

// Admin Operations
function renderAdminTable(tab) {
    const thead = document.getElementById('admin-table-head');
    const tbody = document.getElementById('admin-table-body');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (tab === 'all-bookings') {
        thead.innerHTML = `<tr><th>Booking ID</th><th>Tourist</th><th>Package</th><th>Paid</th><th>Status</th></tr>`;
        bookings.forEach(b => {
            tbody.innerHTML += `<tr><td>${b.id}</td><td>${b.touristEmail}</td><td>${b.packageName}</td><td>$${b.paidAmount} / $${b.totalPrice}</td><td>${b.status}</td></tr>`;
        });
    } else if (tab === 'all-tourists') {
        thead.innerHTML = `<tr><th>Email</th><th>Registered Date</th><th>Active Bookings</th></tr>`;
        tourists.forEach(t => {
            tbody.innerHTML += `<tr><td>${t.email}</td><td>${t.joined}</td><td>${t.bookingsCount}</td></tr>`;
        });
    } else if (tab === 'all-payments') {
        thead.innerHTML = `<tr><th>Payment ID</th><th>Booking ID</th><th>Amount ($)</th><th>Method</th><th>Date</th></tr>`;
        payments.forEach(p => {
            tbody.innerHTML += `<tr><td>${p.id}</td><td>${p.bookingId}</td><td>$${p.amount}</td><td>${p.method}</td><td>${p.date}</td></tr>`;
        });
    }
}

function switchAdminTab(tab, btn) {
    document.querySelectorAll('.tab-controls .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAdminTable(tab);
}

function openInventoryModal() {
    document.getElementById('inventory-form').reset();
    document.getElementById('inv-item-id').value = '';
    document.getElementById('inventory-modal-title').textContent = 'Add Tour Package';
    document.getElementById('inventory-modal').style.display = 'flex';
}

function saveInventoryItem(e) {
    e.preventDefault();
    const id = document.getElementById('inv-item-id').value || 'PKG-' + Math.floor(100 + Math.random() * 900);
    const newPkg = {
        id,
        name: document.getElementById('inv-name').value,
        destination: document.getElementById('inv-destination').value,
        description: document.getElementById('inv-description').value,
        hotel: document.getElementById('inv-hotel').value,
        price: parseFloat(document.getElementById('inv-price').value),
        downpayment: parseFloat(document.getElementById('inv-downpayment').value),
        image: document.getElementById('inv-image').value || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
        date: document.getElementById('inv-date').value
    };

    const idx = packages.findIndex(p => p.id === id);
    if (idx > -1) packages[idx] = newPkg;
    else packages.push(newPkg);

    closeModal('inventory-modal');
    renderPackages();
    renderInventoryTable();
    updateMetrics();
    pushNotification(`Package "${newPkg.name}" updated/added.`);
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    packages.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td><img src="${p.image}" width="40" height="30" style="border-radius:4px; object-fit:cover;"></td>
                <td>${p.name}</td>
                <td>${p.destination}</td>
                <td>${p.hotel}</td>
                <td>$${p.price}</td>
                <td>$${p.downpayment}</td>
                <td><button class="btn btn-secondary" onclick="deletePackage('${p.id}')" style="padding:4px 8px; font-size:11px;">Delete</button></td>
            </tr>
        `;
    });
}

function deletePackage(id) {
    packages = packages.filter(p => p.id !== id);
    renderPackages();
    renderInventoryTable();
    updateMetrics();
}

// Helpers & Utilities
function updateMetrics() {
    document.getElementById('card-packages-count').textContent = packages.length;
    document.getElementById('card-bookings-count').textContent = bookings.length;
    const totalRev = payments.reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('card-payments-total').textContent = `$${totalRev}`;
    document.getElementById('card-tourists-count').textContent = tourists.length;
    renderInventoryTable();
}

function pushNotification(msg) {
    notifications.unshift({ message: msg, time: 'Just now' });
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notification-log-list');
    const badge = document.getElementById('notif-badge');
    list.innerHTML = '';
    badge.textContent = notifications.length;

    notifications.forEach(n => {
        const li = document.createElement('li');
        li.className = 'notif-item';
        li.innerHTML = `
            <i class="fa-solid fa-circle-info notif-icon"></i>
            <span>${n.message}</span>
            <span class="notif-time">${n.time}</span>
        `;
        list.appendChild(li);
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function toggleMobileSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function initChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue ($)',
                data: [1200, 1900, 3000, 2500, 4200, 5100],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}