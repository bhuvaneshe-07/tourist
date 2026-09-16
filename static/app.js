const API_BASE = '/api';

let currentUser = null;
let token = localStorage.getItem('token');

const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('#nav-links a[data-view]');
const alertContainer = document.getElementById('alert-container');

document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    if (token) {
        fetchMe();
    } else {
        showView('home-view');
        loadPackages();
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('search-form').addEventListener('submit', handleSearch);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab).classList.add('active');
        });
    });

    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('booking-modal').classList.remove('flex');
    });

    document.getElementById('hotel-form').addEventListener('submit', saveHotel);
    document.getElementById('package-form').addEventListener('submit', savePackage);
});

function showView(viewId) {
    views.forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    if (viewId === 'home-view') loadPackages();
    if (viewId === 'tourist-dashboard-view' && currentUser?.role === 'tourist') loadTouristDashboard();
    if (viewId === 'admin-dashboard-view' && currentUser?.role === 'admin') loadAdminDashboard();
}

function setupNav() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showView(e.target.dataset.view);
        });
    });
}

function updateNav() {
    document.getElementById('nav-tourist').classList.toggle('hidden', currentUser?.role !== 'tourist');
    document.getElementById('nav-admin').classList.toggle('hidden', currentUser?.role !== 'admin');
    document.getElementById('nav-login').classList.toggle('hidden', !!currentUser);
    document.getElementById('nav-register').classList.toggle('hidden', !!currentUser);
    document.getElementById('nav-logout').classList.toggle('hidden', !currentUser);
}

function showAlert(message, type = 'success') {
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    div.textContent = message;
    alertContainer.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) throw new Error(data.detail || 'An error occurred');
    return data;
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await apiCall('/auth/login', 'POST', { email, password });
        token = res.access_token;
        localStorage.setItem('token', token);
        await fetchMe();
        showAlert('Logged in successfully!');
    } catch (err) { showAlert(err.message, 'error'); }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        const res = await apiCall('/auth/register', 'POST', { name, email, password });
        token = res.access_token;
        localStorage.setItem('token', token);
        await fetchMe();
        showAlert('Registered successfully!');
    } catch (err) { showAlert(err.message, 'error'); }
}

function handleLogout(e) {
    e.preventDefault();
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    updateNav();
    showView('home-view');
    showAlert('Logged out.');
}

async function fetchMe() {
    try {
        currentUser = await apiCall('/auth/me');
        updateNav();
        showView(currentUser.role === 'admin' ? 'admin-dashboard-view' : 'home-view');
    } catch (err) {
        token = null;
        localStorage.removeItem('token');
        updateNav();
        showView('home-view');
    }
}

async function handleSearch(e) {
    e.preventDefault();
    const dest = document.getElementById('search-dest').value;
    const date = document.getElementById('search-date').value;
    let url = `/packages?destination=${encodeURIComponent(dest)}`;
    if (date) url += `&travel_date=${date}`;
    loadPackages(url);
}

async function loadPackages(url = '/packages') {
    try {
        const packages = await apiCall(url);
        const container = document.getElementById('packages-list');
        container.innerHTML = '';
        if(packages.length === 0) {
            container.innerHTML = '<p>No packages found matching your criteria.</p>';
            return;
        }
        packages.forEach(pkg => {
            const card = document.createElement('div');
            card.className = 'card package-card';
            const imgStyle = pkg.image_url ? `background-image: url(${pkg.image_url})` : '';
            card.innerHTML = `
                <div class="package-img" style="${imgStyle}"></div>
                <div class="package-title">${pkg.name}</div>
                <div class="package-meta">📍 ${pkg.destination} | 🏨 ${pkg.hotel_name || 'N/A'} | 📅 ${pkg.available_date}</div>
                <div class="package-desc">${pkg.description}</div>
                <div class="package-price">$${pkg.price.toFixed(2)}</div>
                <button class="btn btn-primary w-100" onclick="openBookingModal(${pkg.id}, '${pkg.name.replace(/'/g, "\\'")}', ${pkg.price})">Book Now</button>
            `;
            container.appendChild(card);
        });
    } catch (err) { showAlert('Error loading packages', 'error'); }
}

function openBookingModal(pkgId, pkgName, price) {
    if (!currentUser) {
        showAlert('Please login to book a package.', 'error');
        showView('login-view');
        return;
    }
    if (currentUser.role !== 'tourist') {
        showAlert('Only tourists can book packages.', 'error');
        return;
    }
    document.getElementById('booking-pkg-id').value = pkgId;
    document.getElementById('booking-pkg-name').textContent = pkgName;
    document.getElementById('booking-pkg-price').textContent = price.toFixed(2);
    document.getElementById('booking-modal').classList.add('flex');
    document.getElementById('booking-form').onsubmit = submitBooking;
}

async function submitBooking(e) {
    e.preventDefault();
    const pkgId = document.getElementById('booking-pkg-id').value;
    const method = document.getElementById('booking-method').value;
    const account = document.getElementById('booking-account').value;
    
    try {
        await apiCall('/bookings', 'POST', { package_id: parseInt(pkgId), payment_method: method, account_number: account });
        showAlert('Booking successful!');
        document.getElementById('booking-modal').classList.remove('flex');
        showView('tourist-dashboard-view');
    } catch (err) { showAlert(err.message, 'error'); }
}

async function loadTouristDashboard() {
    try {
        const [bookings, notifications] = await Promise.all([
            apiCall('/bookings/me'),
            apiCall('/notifications')
        ]);
        
        const tbody = document.getElementById('my-bookings-list');
        tbody.innerHTML = '';
        bookings.forEach(b => {
            const tr = document.createElement('tr');
            let actions = '';
            if (b.status === 'confirmed') {
                actions = `
                    <button class="btn btn-primary" onclick="window.open('/api/bookings/${b.id}/ticket?token=${token}', '_blank')" style="padding:0.4rem 0.8rem;font-size:0.9rem;margin-right:0.5rem;">Ticket</button>
                    <button class="btn btn-danger" onclick="cancelBooking(${b.id})">Cancel</button>
                `;
            }
            tr.innerHTML = `<td>BK-${b.id}</td><td>${b.package_name}</td><td>${b.travel_date}</td><td>${b.status}</td><td>${actions}</td>`;
            tbody.appendChild(tr);
        });

        const notifContainer = document.getElementById('notifications-list');
        notifContainer.innerHTML = '';
        notifications.forEach(n => {
            notifContainer.innerHTML += `<div class="notification-item"><h4>${n.subject}</h4><p>${n.message}</p><small>${new Date(n.created_at).toLocaleString()}</small></div>`;
        });
    } catch (err) { showAlert('Error loading dashboard', 'error'); }
}

async function cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
        await apiCall(`/bookings/${id}/cancel`, 'POST');
        showAlert('Booking cancelled.');
        loadTouristDashboard();
    } catch (err) { showAlert(err.message, 'error'); }
}

async function loadAdminDashboard() {
    try {
        const [stats, hotels, packages, bookings, tourists, payments] = await Promise.all([
            apiCall('/admin/dashboard'), apiCall('/admin/hotels'), apiCall('/admin/packages'),
            apiCall('/admin/bookings'), apiCall('/admin/tourists'), apiCall('/admin/payments')
        ]);
        
        document.getElementById('admin-stats').innerHTML = `
            <div class="stat-card"><h4>Active Bookings</h4><div class="value">${stats.active_bookings}</div></div>
            <div class="stat-card"><h4>Revenue</h4><div class="value">$${stats.payments_total.toFixed(2)}</div></div>
            <div class="stat-card"><h4>Tourists</h4><div class="value">${stats.tourists}</div></div>
            <div class="stat-card"><h4>Packages</h4><div class="value">${stats.packages}</div></div>
        `;

        const hList = document.getElementById('hotels-list');
        const hSelect = document.getElementById('package-hotel');
        hList.innerHTML = '';
        hSelect.innerHTML = '<option value="">Select Hotel</option>';
        hotels.forEach(h => {
            hList.innerHTML += `<tr><td>${h.id}</td><td>${h.name}</td><td>${h.location}</td><td><button class="btn btn-danger" onclick="deleteHotel(${h.id})">Delete</button></td></tr>`;
            hSelect.innerHTML += `<option value="${h.id}">${h.name} (${h.location})</option>`;
        });

        const pList = document.getElementById('admin-packages-list');
        pList.innerHTML = '';
        packages.forEach(p => {
            pList.innerHTML += `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.destination}</td><td>$${p.price.toFixed(2)}</td><td>${p.available_date}</td>
                <td><button class="btn btn-danger" onclick="deletePackage(${p.id})">Delete</button></td></tr>`;
        });

        const bList = document.getElementById('all-bookings-list');
        bList.innerHTML = '';
        bookings.forEach(b => {
            bList.innerHTML += `<tr><td>BK-${b.id}</td><td>${b.tourist_email}</td><td>${b.package_name}</td><td>${b.status}</td><td>${b.payment_reference || '-'}</td></tr>`;
        });

        const tList = document.getElementById('tourists-list');
        tList.innerHTML = '';
        tourists.forEach(t => {
            tList.innerHTML += `<tr><td>${t.id}</td><td>${t.name}</td><td>${t.email}</td><td>${new Date(t.created_at).toLocaleDateString()}</td></tr>`;
        });

        const payList = document.getElementById('payments-list');
        payList.innerHTML = '';
        payments.forEach(p => {
            payList.innerHTML += `<tr><td>${p.reference}</td><td>BK-${p.booking_id}</td><td>$${p.amount.toFixed(2)}</td><td>${p.method}</td><td>${p.status}</td><td>${new Date(p.created_at).toLocaleString()}</td></tr>`;
        });

    } catch (err) { showAlert('Error loading admin dashboard', 'error'); }
}

async function saveHotel(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('hotel-name').value,
        location: document.getElementById('hotel-location').value,
        description: document.getElementById('hotel-desc').value
    };
    try {
        await apiCall('/admin/hotels', 'POST', data);
        showAlert('Hotel saved.');
        document.getElementById('hotel-form').reset();
        loadAdminDashboard();
    } catch (err) { showAlert(err.message, 'error'); }
}

async function deleteHotel(id) {
    if(!confirm('Delete hotel?')) return;
    try {
        await apiCall(`/admin/hotels/${id}`, 'DELETE');
        showAlert('Hotel deleted.');
        loadAdminDashboard();
    } catch (err) { showAlert(err.message, 'error'); }
}

async function savePackage(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('package-name').value,
        destination: document.getElementById('package-dest').value,
        hotel_id: parseInt(document.getElementById('package-hotel').value),
        price: parseFloat(document.getElementById('package-price').value),
        available_date: document.getElementById('package-date').value,
        image_url: document.getElementById('package-img').value,
        description: document.getElementById('package-desc').value
    };
    try {
        await apiCall('/admin/packages', 'POST', data);
        showAlert('Package saved.');
        document.getElementById('package-form').reset();
        loadAdminDashboard();
    } catch (err) { showAlert(err.message, 'error'); }
}

async function deletePackage(id) {
    if(!confirm('Delete package?')) return;
    try {
        await apiCall(`/admin/packages/${id}`, 'DELETE');
        showAlert('Package deleted.');
        loadAdminDashboard();
    } catch (err) { showAlert(err.message, 'error'); }
}
