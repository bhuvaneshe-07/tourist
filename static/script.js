// TourManager Pro Dashboard - Executive Travel Command Engine
// State & Telemetry
let currentRole = 'tourist';
let currentProCurrency = localStorage.getItem('selectedCurrency') || 'USD';
let selectedCategory = '';
let selectedDestination = '';
let chartInstance = null;
let currentChartTimeframe = '30d';

// Currencies definition aligned with Classic Portal
const PRO_CURRENCIES = {
    USD: { symbol: '$', rate: 1.0, name: 'USD' },
    EUR: { symbol: '€', rate: 0.92, name: 'EUR' },
    GBP: { symbol: '£', rate: 0.79, name: 'GBP' },
    JPY: { symbol: '¥', rate: 155.0, name: 'JPY' },
    INR: { symbol: '₹', rate: 86.5, name: 'INR' },
    AUD: { symbol: 'A$', rate: 1.52, name: 'AUD' },
};

function formatProPrice(amountUSD) {
    const curr = PRO_CURRENCIES[currentProCurrency] || PRO_CURRENCIES.USD;
    const val = (Number(amountUSD) || 0) * curr.rate;
    if (currentProCurrency === 'JPY') {
        return `${curr.symbol}${Math.round(val).toLocaleString()}`;
    }
    return `${curr.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Complete 16 World Tour Destinations
let packages = [
    {
        id: '1',
        name: 'Garden City Explorer',
        destination: 'Singapore',
        category: 'Modern Metropolises',
        description: 'Discover Marina Bay Sands, futuristic Supertree Grove, Gardens by the Bay, and Michelin-star culinary street food.',
        hotel: 'Marina Bay Sands & SkyPark Suite',
        price: 1350,
        downpayment: 337,
        rating: 4.9,
        duration: '5 Days / 4 Nights',
        image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
        date: '2026-10-15'
    },
    {
        id: '2',
        name: 'Amalfi Coast Retreat',
        destination: 'Amalfi Coast, Italy',
        category: 'Beach & Islands',
        description: 'Sun-drenched cliffside villas overlooking emerald waters, private yacht tours to Capri, and authentic limoncello tastings.',
        hotel: 'Hotel Santa Caterina Cliffside Villa',
        price: 1850,
        downpayment: 462,
        rating: 4.95,
        duration: '6 Days / 5 Nights',
        image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
        date: '2026-09-28'
    },
    {
        id: '3',
        name: 'Tokyo Lights & Neo Horizon',
        destination: 'Tokyo, Japan',
        category: 'Modern Metropolises',
        description: 'Immerse yourself in neon-lit Shinjuku, serene Meiji Shrine, futuristic teamLab exhibitions, and private omakase dining.',
        hotel: 'Aman Tokyo Panoramic Suite',
        price: 1450,
        downpayment: 362,
        rating: 4.92,
        duration: '7 Days / 6 Nights',
        image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
        date: '2026-11-05'
    },
    {
        id: '4',
        name: 'Santorini Sunset & Caldera Cruise',
        destination: 'Santorini, Greece',
        category: 'Beach & Islands',
        description: 'Whitewashed cliffside suites, legendary Oia sunset catamaran charters, volcanic hot springs, and Greek wine tastings.',
        hotel: 'Canaves Oia Epitome Luxury Suites',
        price: 1650,
        downpayment: 412,
        rating: 4.96,
        duration: '5 Days / 4 Nights',
        image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
        date: '2026-10-02'
    },
    {
        id: '5',
        name: 'Historic Cultural Tour & Colosseum VIP',
        destination: 'Rome, Italy',
        category: 'Cultural & Heritage',
        description: 'After-hours VIP tour of the Colosseum and Vatican Museums, luxury boutique hotel in Trastevere, and private pasta masterclass.',
        hotel: 'Hotel de Russie Roman Garden',
        price: 1100,
        downpayment: 275,
        rating: 4.88,
        duration: '6 Days / 5 Nights',
        image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
        date: '2026-10-20'
    },
    {
        id: '6',
        name: 'Bali Cultural & Jungle Retreat',
        destination: 'Bali, Indonesia',
        category: 'Nature & Wildlife',
        description: 'Private infinity pool villa amidst Ubud rice terraces, spiritual water cleansing ceremonies, and private sunset boat to Nusa Penida.',
        hotel: 'Mandapa, a Ritz-Carlton Reserve',
        price: 950,
        downpayment: 237,
        rating: 4.91,
        duration: '7 Days / 6 Nights',
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
        date: '2026-10-10'
    },
    {
        id: '7',
        name: 'Barcelona Gothic & Gaudí Splendor',
        destination: 'Barcelona, Spain',
        category: 'Cultural & Heritage',
        description: 'Skip-the-line Sagrada Família & Park Güell access, rooftop tapas tasting, and sunset catamaran cruise along the Mediterranean coast.',
        hotel: 'The Barcelona Edition Luxury Hotel',
        price: 1250,
        downpayment: 312,
        rating: 4.87,
        duration: '5 Days / 4 Nights',
        image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=600&q=80',
        date: '2026-11-12'
    },
    {
        id: '8',
        name: 'Parisian Romance & Seine Gala',
        destination: 'Paris, France',
        category: 'Cultural & Heritage',
        description: 'Champagne dinner cruise on the River Seine, private Louvre highlights tour, and palace visit to Versailles with chauffeur.',
        hotel: 'Le Meurice Palace overlooking Tuileries',
        price: 1750,
        downpayment: 437,
        rating: 4.94,
        duration: '6 Days / 5 Nights',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
        date: '2026-12-05'
    },
    {
        id: '9',
        name: 'Alpine Winter Express & Matterhorn',
        destination: 'Zermatt, Switzerland',
        category: 'Alpine & Winter',
        description: 'Glacier Express panoramic train ride, luxury timber ski chalet, Gornergrat railway pass, and Swiss cheese fondue dinner.',
        hotel: 'The Omnia Mountain Lodge Zermatt',
        price: 1950,
        downpayment: 487,
        rating: 4.98,
        duration: '6 Days / 5 Nights',
        image: 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=600&q=80',
        date: '2026-11-20'
    },
    {
        id: '10',
        name: 'Pyramids & Nile River Odyssey',
        destination: 'Cairo, Egypt',
        category: 'Cultural & Heritage',
        description: 'Private Egyptologist guide for the Giza Pyramids and Sphinx, luxury 5-star Nile cruise from Luxor to Aswan, and Valley of the Kings.',
        hotel: 'Mena House Hotel Pyramids View',
        price: 1550,
        downpayment: 387,
        rating: 4.89,
        duration: '8 Days / 7 Nights',
        image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80',
        date: '2026-11-18'
    },
    {
        id: '11',
        name: 'Kyoto Bamboo & Zen Heritage',
        destination: 'Kyoto, Japan',
        category: 'Cultural & Heritage',
        description: 'Stay in a 5-star traditional Machiya ryokan with onsen, participate in authentic tea ceremonies, and explore Arashiyama bamboo forest.',
        hotel: 'Hoshinoya Kyoto River Sanctuary',
        price: 1600,
        downpayment: 400,
        rating: 4.95,
        duration: '6 Days / 5 Nights',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
        date: '2026-10-25'
    },
    {
        id: '12',
        name: 'Cape Town Coast & Table Mountain',
        destination: 'Cape Town, South Africa',
        category: 'Nature & Wildlife',
        description: 'Cable car to Table Mountain, scenic Cape Peninsula drive with Boulders Beach penguins, and Stellenbosch vineyard wine tasting.',
        hotel: 'The Silo Hotel Victoria & Alfred Waterfront',
        price: 1400,
        downpayment: 350,
        rating: 4.90,
        duration: '7 Days / 6 Nights',
        image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80',
        date: '2026-11-30'
    },
    {
        id: '13',
        name: 'Tropical Paradise & Overwater Haven',
        destination: 'Maldives',
        category: 'Beach & Islands',
        description: 'Seaplane transfers to an exclusive private atoll, glass-floor overwater bungalow, bioluminescent night diving, and floating champagne breakfast.',
        hotel: 'Soneva Jani Overwater Water Retreat',
        price: 2400,
        downpayment: 600,
        rating: 4.99,
        duration: '6 Days / 5 Nights',
        image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
        date: '2026-12-10'
    },
    {
        id: '14',
        name: 'Iceland Northern Lights & Glaciers',
        destination: 'Reykjavik, Iceland',
        category: 'Alpine & Winter',
        description: 'Golden Circle super-jeep safari, crystal blue ice cave hike, geothermal Blue Lagoon VIP retreat, and private Aurora Borealis hunt.',
        hotel: 'The Retreat at Blue Lagoon Iceland',
        price: 1800,
        downpayment: 450,
        rating: 4.93,
        duration: '5 Days / 4 Nights',
        image: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=600&q=80',
        date: '2026-12-15'
    },
    {
        id: '15',
        name: 'New York Skyline & Broadway VIP',
        destination: 'New York, USA',
        category: 'Modern Metropolises',
        description: 'Private helicopter tour around Manhattan, orchestra seats to a premier Broadway show, and rooftop dining in SoHo.',
        hotel: 'The Carlyle, A Rosewood Hotel',
        price: 1500,
        downpayment: 375,
        rating: 4.86,
        duration: '5 Days / 4 Nights',
        image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80',
        date: '2026-10-30'
    },
    {
        id: '16',
        name: 'Dubai Desert Safari & Burj Crown',
        destination: 'Dubai, UAE',
        category: 'Modern Metropolises',
        description: 'Private desert dune safari with bedouin starlight dinner, VIP access to the Burj Khalifa Sky Lounge, and yacht marina charter.',
        hotel: 'Burj Al Arab Jumeirah Royal Suite',
        price: 1700,
        downpayment: 425,
        rating: 4.94,
        duration: '5 Days / 4 Nights',
        image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
        date: '2026-11-25'
    }
];

let bookings = [
    {
        id: 'BK-9081',
        touristEmail: 'traveler@executive.io',
        packageId: '9',
        packageName: 'Alpine Winter Express & Matterhorn',
        destination: 'Zermatt, Switzerland',
        date: '2026-11-20',
        totalPrice: 1950,
        paidAmount: 487,
        status: 'Confirmed (Deposit Paid)'
    }
];

let tourists = [
    { email: 'traveler@executive.io', joined: '2026-02-10', bookingsCount: 1 }
];

let payments = [
    { id: 'PAY-301', bookingId: 'BK-9081', amount: 487, method: 'Visa Executive VIP', date: '2026-09-20' }
];

let notifications = [
    { message: '3D Holographic WebGL telemetry engine initialized.', time: 'Just now' },
    { message: 'Deposit payment of $487 received for Booking #BK-9081', time: '15 mins ago' }
];

// Toast notification
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
        success: 'linear-gradient(135deg, #059669, #10b981)',
        error: 'linear-gradient(135deg, #dc2626, #ef4444)',
        info: 'linear-gradient(135deg, #2563eb, #3b82f6)',
        warning: 'linear-gradient(135deg, #d97706, #f59e0b)'
    };
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };

    toast.style.cssText = `
        background: ${bgColors[type] || bgColors.info};
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        gap: 10px;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(16px);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: 380px;
    `;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(16px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
    initNavigationTabs();
    initCurrencySelector();
    await fetchBackendPackages();
    renderPackages();
    renderUserBookings();
    renderFinancialLedger();
    renderInventoryTable();
    renderNotifications();
    updateMetrics();
    initChart();
    init3DGlobe();
    init3DTiltEffects();
});

// Sync Packages from Backend API if available
async function fetchBackendPackages() {
    try {
        const response = await fetch('/api/packages');
        if (response.ok) {
            const apiPackages = await response.json();
            if (Array.isArray(apiPackages) && apiPackages.length > 0) {
                const mapped = apiPackages.map(p => ({
                    id: String(p.id),
                    name: p.name,
                    destination: p.destination,
                    category: p.category || (p.destination && p.destination.includes('Beach') ? 'Beach & Islands' : 'Cultural & Heritage'),
                    description: p.description,
                    hotel: p.hotel_name || (p.hotel ? p.hotel.name : 'Luxury Selected Suite'),
                    price: Number(p.price) || 1200,
                    downpayment: Math.round(Number(p.price) * 0.25) || 300,
                    rating: Number(p.rating) || 4.9,
                    duration: p.duration || '6 Days / 5 Nights',
                    image: p.image_url || 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=600&q=80',
                    date: p.available_date || '2026-11-15'
                }));
                const existingNames = new Set(mapped.map(m => m.name.toLowerCase()));
                packages = [...mapped, ...packages.filter(p => !existingNames.has(p.name.toLowerCase()))];
            }
        }
    } catch (e) {
        console.warn('[Pro Dashboard] Using local world package catalogue:', e);
    }
}

// Navigation Tabs
function initNavigationTabs() {
    const tabs = document.querySelectorAll('.pro-nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = tab.getAttribute('data-target');
            if (targetId) {
                switchToSection(targetId);
            }
        });
    });
}

function switchToSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active-section'));
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active-section');
    }
    document.querySelectorAll('.pro-nav-tab').forEach(t => {
        if (t.getAttribute('data-target') === sectionId) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Currency Selector
function initCurrencySelector() {
    const sel = document.getElementById('currency-select-pro');
    if (sel) {
        sel.value = currentProCurrency;
    }
}

function changeProCurrency(currencyCode) {
    if (!PRO_CURRENCIES[currencyCode]) return;
    currentProCurrency = currencyCode;
    localStorage.setItem('selectedCurrency', currencyCode);
    const sel = document.getElementById('currency-select-pro');
    if (sel) sel.value = currencyCode;
    const chartLabel = document.getElementById('chart-currency-label');
    if (chartLabel) chartLabel.textContent = currencyCode;

    renderPackages();
    renderUserBookings();
    renderFinancialLedger();
    renderInventoryTable();
    updateMetrics();
    initChart();
    showToast(`Currency updated to ${currencyCode}`, 'info');
}

// Role Switching
function switchRole(role) {
    currentRole = role;
    const adminTabs = document.querySelectorAll('.admin-only');
    if (role === 'admin') {
        adminTabs.forEach(t => t.style.display = 'inline-flex');
        showToast('Switched to Administrator View', 'info');
    } else {
        adminTabs.forEach(t => t.style.display = 'none');
        showToast('Switched to Tourist View', 'info');
    }
    updateMetrics();
}

// Package Filtering & Rendering
function filterByCategory(cat) {
    selectedCategory = cat;
    document.querySelectorAll('#category-filter-chips .pro-chip').forEach(btn => {
        const text = btn.textContent;
        if ((!cat && text.includes('All')) || (cat && text.includes(cat))) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    filterPackages();
    switchToSection('search-section');
}

function filterByDestination(dest) {
    selectedDestination = dest;
    const searchInput = document.getElementById('search-dest');
    if (searchInput) searchInput.value = dest;
    document.querySelectorAll('#destination-filter-pills .pro-chip').forEach(btn => {
        const text = btn.textContent;
        if ((!dest && text.includes('All Destinations')) || (dest && text.includes(dest))) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    filterPackages();
    switchToSection('search-section');
}

function filterPackages() {
    const searchVal = (document.getElementById('search-dest')?.value || '').toLowerCase().trim();
    const dateVal = document.getElementById('search-date')?.value || '';
    const priceRange = document.getElementById('filter-price-range')?.value || '';
    const sortBy = document.getElementById('filter-sort-by')?.value || 'recommended';

    let filtered = packages.filter(pkg => {
        // Keyword match
        const matchesQuery = !searchVal || 
            pkg.name.toLowerCase().includes(searchVal) ||
            pkg.destination.toLowerCase().includes(searchVal) ||
            pkg.hotel.toLowerCase().includes(searchVal) ||
            pkg.description.toLowerCase().includes(searchVal);

        // Date match
        const matchesDate = !dateVal || pkg.date === dateVal;

        // Category match
        const matchesCategory = !selectedCategory || (pkg.category && pkg.category.toLowerCase().includes(selectedCategory.toLowerCase()));

        // Price range match (in USD base)
        let matchesPrice = true;
        if (priceRange === 'under-1000') matchesPrice = pkg.price < 1000;
        else if (priceRange === '1000-1500') matchesPrice = pkg.price >= 1000 && pkg.price <= 1500;
        else if (priceRange === '1500-2000') matchesPrice = pkg.price > 1500 && pkg.price <= 2000;
        else if (priceRange === 'above-2000') matchesPrice = pkg.price > 2000;

        return matchesQuery && matchesDate && matchesCategory && matchesPrice;
    });

    // Sorting
    if (sortBy === 'price-asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'date-soonest') {
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    renderPackages(filtered);
}

function resetSearch() {
    selectedCategory = '';
    selectedDestination = '';
    const sInput = document.getElementById('search-dest');
    const dInput = document.getElementById('search-date');
    const pRange = document.getElementById('filter-price-range');
    const sSort = document.getElementById('filter-sort-by');
    if (sInput) sInput.value = '';
    if (dInput) dInput.value = '';
    if (pRange) pRange.value = '';
    if (sSort) sSort.value = 'recommended';

    document.querySelectorAll('#category-filter-chips .pro-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('#category-filter-chips .pro-chip')?.classList.add('active');

    document.querySelectorAll('#destination-filter-pills .pro-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('#destination-filter-pills .pro-chip')?.classList.add('active');

    renderPackages(packages);
}

function quickSearch() {
    const q = document.getElementById('quick-dest-input')?.value || '';
    const d = document.getElementById('quick-date-input')?.value || '';
    const searchDest = document.getElementById('search-dest');
    const searchDate = document.getElementById('search-date');
    if (searchDest) searchDest.value = q;
    if (searchDate) searchDate.value = d;
    switchToSection('search-section');
    filterPackages();
}

function renderPackages(items = packages) {
    const container = document.getElementById('package-grid-container');
    if (!container) return;

    const countBadge = document.getElementById('packages-count-badge');
    if (countBadge) {
        countBadge.textContent = `${items.length} Active Expedition${items.length === 1 ? '' : 's'}`;
    }

    const navBadge = document.getElementById('nav-packages-count');
    if (navBadge) {
        navBadge.textContent = packages.length;
    }

    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: rgba(22, 31, 49, 0.6); border-radius: 14px; border: 1px dashed rgba(255,255,255,0.15);">
                <i class="fa-solid fa-compass" style="font-size: 32px; color: #64748b; margin-bottom: 12px;"></i>
                <h3 style="color: #cbd5e1; font-size: 16px;">No Matching Expeditions Found</h3>
                <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 16px 0;">Try clearing your search query or selecting a different travel style.</p>
                <button class="btn btn-primary" onclick="resetSearch()"><i class="fa-solid fa-rotate-left"></i> Reset All Filters</button>
            </div>
        `;
        return;
    }

    items.forEach(pkg => {
        const card = document.createElement('div');
        card.className = 'package-card card-3d-tilt';

        const formattedTotal = formatProPrice(pkg.price);
        const formattedDeposit = formatProPrice(pkg.downpayment || Math.round(pkg.price * 0.25));

        card.innerHTML = `
            <div class="package-img" style="background-image: url('${pkg.image}')">
                <span class="package-price-tag">${formattedTotal}</span>
                <span style="position: absolute; top: 10px; left: 10px; background: rgba(11, 15, 25, 0.85); backdrop-filter: blur(6px); color: #38bdf8; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                    <i class="fa-solid fa-star" style="color: #f59e0b;"></i> ${pkg.rating || '4.9'}
                </span>
            </div>
            <div class="package-details">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <h3 style="font-size: 16px; font-weight: 700; color: #ffffff;">${pkg.name}</h3>
                </div>
                <p class="package-location"><i class="fa-solid fa-location-dot" style="color: #38bdf8;"></i> ${pkg.destination}</p>
                <p class="package-desc">${pkg.description}</p>
                
                <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px 10px; margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 3px;">
                        <span style="color: #94a3b8;"><i class="fa-solid fa-hotel"></i> ${pkg.hotel}</span>
                        <span style="color: #a78bfa; font-weight: 600;"><i class="fa-solid fa-clock"></i> ${pkg.duration || '5 Days'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                        <span style="color: #94a3b8;"><i class="fa-solid fa-calendar-day"></i> Available from:</span>
                        <span style="color: #cbd5e1; font-weight: 600;">${pkg.date}</span>
                    </div>
                </div>

                <div class="package-footer" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div>
                        <span style="font-size: 10px; color: #34d399; text-transform: uppercase; font-weight: 700; display: block;">25% Deposit:</span>
                        <strong style="font-size: 14px; color: #ffffff;">${formattedDeposit}</strong>
                    </div>
                    <button type="button" class="btn btn-primary" onclick="openBookingModal('${pkg.id}')" style="font-size: 12px; padding: 8px 16px;">
                        <i class="fa-solid fa-compass"></i> Book Now
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if (typeof init3DTiltEffects === 'function') {
        init3DTiltEffects();
    }
}

// Booking Modal Logic
let activeModalPkg = null;

function openBookingModal(pkgId) {
    activeModalPkg = packages.find(p => p.id === String(pkgId));
    if (!activeModalPkg) return;

    document.getElementById('modal-pkg-id').value = activeModalPkg.id;
    document.getElementById('booking-pkg-name').textContent = activeModalPkg.name;
    document.getElementById('booking-pkg-dest').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${activeModalPkg.destination} &bull; ${activeModalPkg.hotel}`;
    document.getElementById('booking-pkg-price').textContent = formatProPrice(activeModalPkg.price);
    
    const depositAmt = activeModalPkg.downpayment || Math.round(activeModalPkg.price * 0.25);
    document.getElementById('booking-pkg-deposit').textContent = formatProPrice(depositAmt);
    document.getElementById('booking-live-downpayment').textContent = formatProPrice(depositAmt);

    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.value = activeModalPkg.date || '2026-11-15';
    }

    document.getElementById('booking-modal').style.display = 'flex';
}

function recalculateModalDeposit() {
    if (!activeModalPkg) return;
    const travelerCount = parseInt(document.getElementById('booking-travelers')?.value || '1', 10);
    const totalUSD = activeModalPkg.price * travelerCount;
    const depositUSD = Math.round(totalUSD * 0.25);

    document.getElementById('booking-pkg-price').textContent = formatProPrice(totalUSD);
    document.getElementById('booking-pkg-deposit').textContent = formatProPrice(depositUSD);
    document.getElementById('booking-live-downpayment').textContent = formatProPrice(depositUSD);
}

async function submitBooking(event) {
    event.preventDefault();
    if (!activeModalPkg) return;

    const leadName = document.getElementById('booking-name').value;
    const email = document.getElementById('booking-email').value;
    const travelers = parseInt(document.getElementById('booking-travelers').value || '1', 10);
    const travelDate = document.getElementById('booking-date').value;

    const totalUSD = activeModalPkg.price * travelers;
    const depositUSD = Math.round(totalUSD * 0.25);
    const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking = {
        id: bookingId,
        touristEmail: email,
        packageId: activeModalPkg.id,
        packageName: activeModalPkg.name,
        destination: activeModalPkg.destination,
        date: travelDate,
        totalPrice: totalUSD,
        paidAmount: depositUSD,
        status: 'Confirmed (25% Deposit Paid)'
    };

    bookings.unshift(newBooking);
    payments.unshift({
        id: `PAY-${Math.floor(100 + Math.random() * 900)}`,
        bookingId: bookingId,
        amount: depositUSD,
        method: 'Visa Platinum VIP',
        date: new Date().toISOString().split('T')[0]
    });

    if (!tourists.find(t => t.email === email)) {
        tourists.push({ email, joined: new Date().toISOString().split('T')[0], bookingsCount: 1 });
    }

    // Try posting to real backend
    try {
        await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                package_id: Number(activeModalPkg.id) || 1,
                booking_date: travelDate,
                special_requests: document.getElementById('booking-notes')?.value || '',
                travelers_count: travelers
            })
        });
    } catch (e) {
        console.warn('Backend sync note:', e);
    }

    closeModal('booking-modal');
    renderUserBookings();
    renderFinancialLedger();
    updateMetrics();
    initChart();

    showToast(`🎉 Expedition booked! Deposit of ${formatProPrice(depositUSD)} confirmed for ${leadName}.`, 'success');
    pushNotification(`Expedition reserved: ${activeModalPkg.name} by ${email}`);
    switchToSection('my-bookings-section');
}

// User Bookings Table
function renderUserBookings() {
    const tbody = document.getElementById('user-bookings-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">No active bookings found. Explore our 16 curated tours to book your next expedition.</td></tr>';
        return;
    }

    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: #38bdf8;">#${b.id}</strong></td>
            <td>${b.packageName}</td>
            <td><i class="fa-solid fa-location-dot" style="color:#38bdf8;"></i> ${b.destination}</td>
            <td>${b.date}</td>
            <td style="font-weight: 700; color: #ffffff;">${formatProPrice(b.totalPrice)}</td>
            <td style="color: #34d399; font-weight: 700;">${formatProPrice(b.paidAmount)}</td>
            <td><span style="background: rgba(16,185,129,0.2); color: #34d399; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${b.status}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="cancelBooking('${b.id}')" style="padding: 4px 8px; font-size: 11px; color: #f87171;">Cancel</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function cancelBooking(id) {
    bookings = bookings.filter(b => b.id !== id);
    renderUserBookings();
    renderFinancialLedger();
    updateMetrics();
    initChart();
    showToast('Booking cancelled.', 'info');
}

// Financial Ledger Table
function renderFinancialLedger() {
    const tbody = document.getElementById('financial-bookings-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${b.id}</td>
            <td>${b.touristEmail}</td>
            <td>${b.packageName}</td>
            <td>${b.date}</td>
            <td style="font-weight: 700;">${formatProPrice(b.totalPrice)}</td>
            <td style="color: #34d399; font-weight: 700;">${formatProPrice(b.paidAmount)} (Paid)</td>
            <td><span style="background: rgba(16,185,129,0.2); color: #34d399; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700;">Confirmed</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Inventory Table
function renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    packages.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.destination}</td>
            <td>${p.hotel}</td>
            <td>${formatProPrice(p.price)}</td>
            <td>${formatProPrice(p.downpayment || Math.round(p.price * 0.25))}</td>
            <td>${p.date}</td>
            <td>
                <button class="btn btn-secondary" onclick="deletePackage('${p.id}')" style="padding: 4px 8px; font-size: 11px; color: #f87171;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deletePackage(id) {
    packages = packages.filter(p => p.id !== String(id));
    renderPackages();
    renderInventoryTable();
    updateMetrics();
    showToast('Package removed from catalogue.', 'info');
}

function openAddPackageModal() {
    document.getElementById('add-package-modal').style.display = 'flex';
}

function submitNewPackage(event) {
    event.preventDefault();
    const name = document.getElementById('new-pkg-name').value;
    const dest = document.getElementById('new-pkg-dest').value;
    const hotel = document.getElementById('new-pkg-hotel').value;
    const price = Number(document.getElementById('new-pkg-price').value) || 1200;
    const date = document.getElementById('new-pkg-date').value;
    const category = document.getElementById('new-pkg-category').value;
    const image = document.getElementById('new-pkg-img').value;
    const desc = document.getElementById('new-pkg-desc').value;

    const newPkg = {
        id: String(packages.length + 1),
        name,
        destination: dest,
        category,
        description: desc,
        hotel,
        price,
        downpayment: Math.round(price * 0.25),
        rating: 5.0,
        duration: '6 Days / 5 Nights',
        image,
        date
    };

    packages.unshift(newPkg);
    closeModal('add-package-modal');
    renderPackages();
    renderInventoryTable();
    updateMetrics();
    showToast(`Package "${name}" added to global catalogue!`, 'success');
}

// Pro AI Concierge
async function askAI(promptText) {
    const input = document.getElementById('pro-ai-input');
    if (input) input.value = promptText;
    switchToSection('ai-concierge-section');
    await runAIQuery(promptText);
}

async function handleProAISubmit(event) {
    event.preventDefault();
    const input = document.getElementById('pro-ai-input');
    if (!input || !input.value.trim()) return;
    await runAIQuery(input.value.trim());
}

async function runAIQuery(query) {
    const responseBox = document.getElementById('pro-ai-response');
    const responseText = document.getElementById('pro-ai-response-text');
    const submitBtn = document.getElementById('pro-ai-submit-btn');

    if (!responseBox || !responseText) return;

    responseBox.classList.add('active');
    responseText.innerHTML = '<span style="color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Consulting TourGuide AI flight telemetry & destination catalogue...</span>';
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: query })
        });
        if (res.ok) {
            const data = await res.json();
            const reply = data.reply || data.response || data.message || 'No response received from travel consultant.';
            const formatted = reply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n- /g, '<br>&bull; ');
            responseText.innerHTML = formatted;
        } else {
            responseText.innerHTML = `<span style="color:#f87171;">Unable to connect to AI service. Please try again.</span>`;
        }
    } catch (e) {
        responseText.innerHTML = `<span style="color:#f87171;">Error contacting AI concierge: ${e.message}</span>`;
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Metrics Updating
function updateMetrics() {
    const pkgCount = document.getElementById('card-packages-count');
    if (pkgCount) pkgCount.textContent = packages.length;

    const bookCount = document.getElementById('card-bookings-count');
    if (bookCount) bookCount.textContent = bookings.length;

    const totalRev = payments.reduce((sum, p) => sum + p.amount, 0);
    const payTotal = document.getElementById('card-payments-total');
    if (payTotal) payTotal.textContent = formatProPrice(totalRev);

    const tourCount = document.getElementById('card-tourists-count');
    if (tourCount) tourCount.textContent = tourists.length;
}

function pushNotification(msg) {
    notifications.unshift({ message: msg, time: 'Just now' });
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notification-log-list');
    const badge = document.getElementById('notif-badge');
    if (!list) return;
    list.innerHTML = '';
    if (badge) badge.textContent = notifications.length;

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

function openNotificationsModal() {
    document.getElementById('notifications-modal').style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Chart.js Revenue Telemetry
function initChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const currRate = (PRO_CURRENCIES[currentProCurrency] || PRO_CURRENCIES.USD).rate;
    const currSymbol = (PRO_CURRENCIES[currentProCurrency] || PRO_CURRENCIES.USD).symbol;

    const baseData = {
        '7d': {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            revenueUSD: [1200, 1850, 2400, 1950, 3100, 4200, 3800],
            bookings: [1, 2, 2, 1, 3, 4, 3]
        },
        '30d': {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            revenueUSD: [5200, 7800, 9400, 12600],
            bookings: [5, 8, 11, 15]
        },
        '90d': {
            labels: ['Jul', 'Aug', 'Sep', 'Oct'],
            revenueUSD: [18400, 24900, 31200, 39500],
            bookings: [21, 28, 35, 44]
        },
        '1y': {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            revenueUSD: [14000, 17500, 22000, 26000, 31000, 38000, 46000, 52000, 59000, 66000, 74000, 85000],
            bookings: [16, 20, 25, 30, 36, 44, 52, 60, 68, 75, 83, 94]
        }
    };

    const activeSet = baseData[currentChartTimeframe] || baseData['30d'];
    const convertedRevenue = activeSet.revenueUSD.map(v => Math.round(v * currRate));

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: activeSet.labels,
            datasets: [
                {
                    label: `Revenue (${currSymbol})`,
                    data: convertedRevenue,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#38bdf8',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.35,
                    yAxisID: 'y'
                },
                {
                    label: 'Bookings Volume',
                    data: activeSet.bookings,
                    borderColor: '#34d399',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#34d399',
                    pointRadius: 3,
                    fill: false,
                    tension: 0.35,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#94a3b8',
                        boxWidth: 12,
                        font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return ` Revenue: ${currSymbol}${context.parsed.y.toLocaleString()}`;
                            }
                            return ` Bookings: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        callback: (val) => `${currSymbol}${val.toLocaleString()}`
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        color: '#34d399',
                        font: { size: 11 },
                        stepSize: 1
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

function setChartTimeframe(tf, btnElement) {
    currentChartTimeframe = tf;
    if (btnElement && btnElement.parentElement) {
        btnElement.parentElement.querySelectorAll('.chart-tf-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    initChart();
}

// CSV Export
function exportDataCSV(type = 'bookings') {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (type === 'bookings') {
        csvContent += 'Booking ID,Tourist Email,Package,Destination,Travel Date,Total USD,Paid USD,Status\n';
        bookings.forEach(b => {
            csvContent += `"${b.id}","${b.touristEmail}","${b.packageName}","${b.destination}","${b.date}","${b.totalPrice}","${b.paidAmount}","${b.status}"\n`;
        });
    } else {
        csvContent += 'ID,Title,Destination,Category,Hotel Partner,Price USD,Deposit USD,Available Date\n';
        packages.forEach(p => {
            csvContent += `"${p.id}","${p.name}","${p.destination}","${p.category}","${p.hotel}","${p.price}","${p.downpayment}","${p.date}"\n`;
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TourManager-${type}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Exported ${type} dataset as CSV.`, 'success');
}

// ==========================================================================
// 3D Telemetry Visualizer & Interactive Three.js WebGL Holographic Globe
// ==========================================================================
let globeRenderer = null;
let globeScene = null;
let globeCamera = null;
let globeMeshGroup = null;
let isGlobeDragging = false;
let previousPointerPosition = { x: 0, y: 0 };
let globeAutoRotateSpeed = 0.003;

function switch3DView(view) {
    const interactiveBtn = document.getElementById('btn-view-interactive');
    const cinemaBtn = document.getElementById('btn-view-cinema');
    const globeContainer = document.getElementById('globe3d-container');
    const cinemaView = document.getElementById('cinema-view');

    if (view === 'cinema') {
        if (interactiveBtn) interactiveBtn.classList.remove('active');
        if (cinemaBtn) cinemaBtn.classList.add('active');
        if (globeContainer) globeContainer.style.display = 'none';
        if (cinemaView) cinemaView.classList.add('active');
    } else {
        if (cinemaBtn) cinemaBtn.classList.remove('active');
        if (interactiveBtn) interactiveBtn.classList.add('active');
        if (cinemaView) cinemaView.classList.remove('active');
        if (globeContainer) {
            globeContainer.style.display = 'flex';
            if (window.resize3DGlobe) window.resize3DGlobe();
        }
    }
}

function init3DGlobe() {
    const container = document.getElementById('globe3d-container');
    const canvas = document.getElementById('globe3d-canvas');
    if (!container || !canvas || typeof THREE === 'undefined') {
        return;
    }

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 340;

    // Scene setup
    globeScene = new THREE.Scene();
    globeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    globeCamera.position.z = 210;

    try {
        globeRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        globeRenderer.setSize(width, height);
        globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
        console.warn('[3D Globe] WebGL not supported, falling back to cinema render:', e);
        switch3DView('cinema');
        return;
    }

    globeMeshGroup = new THREE.Group();
    globeScene.add(globeMeshGroup);

    // 1. Digital Wireframe Grid Sphere
    const sphereRadius = 68;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x1e3a8a,
        wireframe: true,
        transparent: true,
        opacity: 0.22
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeMeshGroup.add(sphereMesh);

    // 2. Glowing Point Cloud Particle Shell
    const particleCount = 1400;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / particleCount);
        const theta = Math.sqrt(particleCount * Math.PI) * phi;
        const r = sphereRadius + (Math.random() * 2 - 1);
        particlePositions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
        particlePositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
        particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 1.8,
        transparent: true,
        opacity: 0.8
    });
    const particleCloud = new THREE.Points(particleGeo, particleMat);
    globeMeshGroup.add(particleCloud);

    // 3. Ambient Atmospheric Glow Rings
    const ringGeo = new THREE.RingGeometry(sphereRadius + 6, sphereRadius + 7.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.3;
    globeMeshGroup.add(ringMesh);

    // Coordinates Helper
    function latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        return new THREE.Vector3(
            -(radius * Math.sin(phi) * Math.cos(theta)),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    // Travel Hubs & Beacon Markers
    const travelHubs = [
        { name: 'Tokyo', lat: 35.6762, lon: 139.6503, color: 0x10b981 },
        { name: 'Paris', lat: 48.8566, lon: 2.3522, color: 0x38bdf8 },
        { name: 'New York', lat: 40.7128, lon: -74.0060, color: 0xa855f7 },
        { name: 'Bali', lat: -8.4095, lon: 115.1889, color: 0xf59e0b },
        { name: 'Zurich', lat: 47.3769, lon: 8.5417, color: 0x38bdf8 },
        { name: 'Dubai', lat: 25.2048, lon: 55.2708, color: 0xec4899 }
    ];

    travelHubs.forEach(hub => {
        const pos = latLonToVector3(hub.lat, hub.lon, sphereRadius + 0.5);
        const dotGeo = new THREE.SphereGeometry(2.2, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({ color: hub.color });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(pos);
        globeMeshGroup.add(dot);

        // Radar Pulse Ring on Hub
        const beaconRingGeo = new THREE.RingGeometry(3.5, 4.5, 20);
        const beaconRingMat = new THREE.MeshBasicMaterial({
            color: hub.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65
        });
        const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
        beaconRing.position.copy(pos.clone().multiplyScalar(1.02));
        beaconRing.lookAt(pos.clone().multiplyScalar(2));
        globeMeshGroup.add(beaconRing);
    });

    // Supersonic Flight Trajectory Curves
    const flightRoutes = [
        { from: travelHubs[2], to: travelHubs[1], color: 0x38bdf8 },
        { from: travelHubs[1], to: travelHubs[0], color: 0x10b981 },
        { from: travelHubs[5], to: travelHubs[3], color: 0xf59e0b },
        { from: travelHubs[4], to: travelHubs[5], color: 0xa855f7 }
    ];

    flightRoutes.forEach(route => {
        const v1 = latLonToVector3(route.from.lat, route.from.lon, sphereRadius);
        const v2 = latLonToVector3(route.to.lat, route.to.lon, sphereRadius);
        
        const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
        const midLength = mid.length();
        mid.normalize();
        mid.multiplyScalar(midLength + 22);

        const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
        const curvePoints = curve.getPoints(36);
        const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const curveMat = new THREE.LineBasicMaterial({
            color: route.color,
            transparent: true,
            opacity: 0.75,
            linewidth: 2
        });
        const flightLine = new THREE.Line(curveGeo, curveMat);
        globeMeshGroup.add(flightLine);
    });

    // Interactive Drag Controls
    container.addEventListener('pointerdown', (e) => {
        isGlobeDragging = true;
        previousPointerPosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
        if (!isGlobeDragging || !globeMeshGroup) return;
        const deltaX = e.clientX - previousPointerPosition.x;
        const deltaY = e.clientY - previousPointerPosition.y;

        globeMeshGroup.rotation.y += deltaX * 0.006;
        globeMeshGroup.rotation.x += deltaY * 0.006;

        previousPointerPosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
        isGlobeDragging = false;
    });

    window.resize3DGlobe = function() {
        if (!container || !globeRenderer || !globeCamera) return;
        const newW = container.clientWidth || 380;
        const newH = container.clientHeight || 340;
        globeCamera.aspect = newW / newH;
        globeCamera.updateProjectionMatrix();
        globeRenderer.setSize(newW, newH);
    };
    window.addEventListener('resize', window.resize3DGlobe);

    globeMeshGroup.rotation.x = 0.25;

    function animateGlobe() {
        requestAnimationFrame(animateGlobe);
        if (!isGlobeDragging && globeMeshGroup) {
            globeMeshGroup.rotation.y += globeAutoRotateSpeed;
        }
        if (globeRenderer && globeScene && globeCamera) {
            globeRenderer.render(globeScene, globeCamera);
        }
    }
    animateGlobe();
}

// 3D Perspective Tilt on Interactive Cards
function init3DTiltEffects() {
    const tiltCards = document.querySelectorAll('.card-3d-tilt');
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px) scale3d(1.015, 1.015, 1.015)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)';
        });
    });
}
