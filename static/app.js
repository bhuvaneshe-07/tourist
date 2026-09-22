const API_BASE = '/api';

let currentUser = null;
let token = localStorage.getItem('token');
let currentCurrency = localStorage.getItem('selectedCurrency') || 'USD';
let allLoadedPackages = [];
let displayedPackages = [];
let comparedPackageIds = new Set();
let selectedCategory = '';
let activeAISearchState = null;

const CURRENCIES = {
    USD: { symbol: '$', rate: 1.0, name: 'USD' },
    EUR: { symbol: '€', rate: 0.92, name: 'EUR' },
    GBP: { symbol: '£', rate: 0.79, name: 'GBP' },
    JPY: { symbol: '¥', rate: 155.0, name: 'JPY' },
    INR: { symbol: '₹', rate: 86.5, name: 'INR' },
    AUD: { symbol: 'A$', rate: 1.52, name: 'AUD' },
};

function formatPrice(amountUSD) {
    const curr = CURRENCIES[currentCurrency] || CURRENCIES.USD;
    const converted = (amountUSD || 0) * curr.rate;
    if (currentCurrency === 'JPY') {
        return `${curr.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('#nav-links a[data-view]');
const alertContainer = document.getElementById('alert-container');

document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    setupCurrencySelector();
    setupFiltersAndSort();
    setupComparison();
    setupModals();
    setupBookingCalculator();

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

    // Clear search handler
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            resetAISearch(false);
            document.getElementById('search-dest').value = '';
            document.getElementById('search-date').value = '';
            document.getElementById('filter-price-range').value = '';
            document.getElementById('filter-sort-by').value = 'recommended';
            selectedCategory = '';
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            const allCat = document.querySelector('.category-chip[data-category=""]');
            if (allCat) allCat.classList.add('active');
            document.querySelectorAll('.dest-chip').forEach(c => c.classList.remove('active'));
            const allChip = document.querySelector('.dest-chip[data-dest=""]');
            if (allChip) allChip.classList.add('active');
            loadPackages();
        });
    }

    // AI Natural Language Search Event Listeners
    const aiSearchBtn = document.getElementById('ai-search-btn');
    if (aiSearchBtn) {
        aiSearchBtn.addEventListener('click', () => handleAISearch());
    }
    const aiClearBtn = document.getElementById('ai-clear-search-btn');
    if (aiClearBtn) {
        aiClearBtn.addEventListener('click', () => resetAISearch(true));
    }
    const aiEmptyResetBtn = document.getElementById('ai-empty-reset-btn');
    if (aiEmptyResetBtn) {
        aiEmptyResetBtn.addEventListener('click', () => resetAISearch(true));
    }
    document.querySelectorAll('.ai-search-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const q = pill.dataset.query;
            if (q) handleAISearch(q);
        });
    });

    // Destination filter chips
    document.querySelectorAll('.dest-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.dest-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const dest = chip.dataset.dest || '';
            document.getElementById('search-dest').value = dest;
            const date = document.getElementById('search-date').value;
            let url = dest ? `/packages?destination=${encodeURIComponent(dest)}` : '/packages';
            if (date) url += (dest ? '&' : '?') + `travel_date=${date}`;
            loadPackages(url);
        });
    });

    // AI Assistant Handlers
    setupAIAssistant();

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

function setupCurrencySelector() {
    const selector = document.getElementById('currency-select');
    if (!selector) return;
    selector.value = currentCurrency;
    selector.addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        localStorage.setItem('selectedCurrency', currentCurrency);
        // Refresh prices on cards, comparison, and booking modal
        applyFiltersAndRender();
        if (document.getElementById('booking-modal')?.classList.contains('flex')) {
            updateBookingInvoice();
        }
        if (document.getElementById('compare-modal')?.classList.contains('flex')) {
            renderComparisonModal();
        }
    });
}

function setupFiltersAndSort() {
    // Category chips
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedCategory = chip.dataset.category || '';
            applyFiltersAndRender();
        });
    });

    const priceFilter = document.getElementById('filter-price-range');
    if (priceFilter) {
        priceFilter.addEventListener('change', () => applyFiltersAndRender());
    }

    const sortFilter = document.getElementById('filter-sort-by');
    if (sortFilter) {
        sortFilter.addEventListener('change', () => applyFiltersAndRender());
    }
}

function setupComparison() {
    const openBtn = document.getElementById('open-compare-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            renderComparisonModal();
            document.getElementById('compare-modal').classList.add('flex');
        });
    }

    const clearBtns = [document.getElementById('dock-clear-compare-btn'), document.getElementById('clear-compare-list-btn')];
    clearBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                comparedPackageIds.clear();
                updateCompareDock();
                document.querySelectorAll('.compare-chk').forEach(c => c.checked = false);
                document.getElementById('compare-modal')?.classList.remove('flex');
            });
        }
    });
}

function togglePackageComparison(pkgId, checked) {
    if (checked) {
        if (comparedPackageIds.size >= 3) {
            showAlert('You can compare up to 3 packages at a time.', 'error');
            const chk = document.querySelector(`.compare-chk[data-id="${pkgId}"]`);
            if (chk) chk.checked = false;
            return;
        }
        comparedPackageIds.add(pkgId);
    } else {
        comparedPackageIds.delete(pkgId);
    }
    updateCompareDock();
}

function updateCompareDock() {
    const dock = document.getElementById('compare-dock');
    const countText = document.getElementById('compare-count-text');
    if (!dock || !countText) return;

    const count = comparedPackageIds.size;
    if (count > 0) {
        dock.classList.remove('hidden');
        countText.textContent = `${count} package${count > 1 ? 's' : ''} selected to compare (max 3)`;
    } else {
        dock.classList.add('hidden');
    }
}

function renderComparisonModal() {
    const container = document.getElementById('compare-grid-container');
    if (!container) return;

    const packages = allLoadedPackages.filter(p => comparedPackageIds.has(p.id));
    if (packages.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:2rem;">No packages selected for comparison. Please select 2 or 3 packages to compare side-by-side.</p>';
        return;
    }

    // Find lowest price
    const lowestPrice = Math.min(...packages.map(p => p.price));

    let html = '';
    packages.forEach(pkg => {
        const isBestValue = pkg.price === lowestPrice && packages.length > 1;
        const imgStyle = pkg.image_url ? `background-image: url(${pkg.image_url})` : '';
        const rating = pkg.rating ? pkg.rating.toFixed(1) : '4.9';
        const reviews = pkg.review_count || 12;

        html += `
            <div class="compare-col-card ${isBestValue ? 'winner' : ''}">
                ${isBestValue ? '<div class="compare-col-badge">🌟 Best Value</div>' : ''}
                <div class="compare-img-thumb" style="${imgStyle}"></div>
                <h3 style="font-size:1.1rem;margin-bottom:0.25rem;">${pkg.name}</h3>
                <div style="font-size:1.25rem;font-weight:800;color:var(--primary);margin-bottom:0.75rem;">
                    ${formatPrice(pkg.price)} <small style="font-size:0.75rem;font-weight:normal;color:var(--gray);">/ person</small>
                </div>
                
                <div class="compare-feature-row">
                    <strong>Destination</strong>
                    📍 ${pkg.destination}
                </div>
                <div class="compare-feature-row">
                    <strong>Duration & Style</strong>
                    ⏱️ ${pkg.duration_days || 7} Days | ${pkg.category || 'Scenic Discovery'}
                </div>
                <div class="compare-feature-row">
                    <strong>Accommodation</strong>
                    🏨 ${pkg.hotel_name || 'World-Class Partner Hotel'}
                </div>
                <div class="compare-feature-row">
                    <strong>Guest Satisfaction</strong>
                    ★ ${rating} / 5.0 (${reviews} traveler reviews)
                </div>
                <div class="compare-feature-row">
                    <strong>Available Departure</strong>
                    📅 ${pkg.available_date}
                </div>
                <div class="compare-feature-row" style="flex:1;">
                    <strong>Package Highlights</strong>
                    ${pkg.description}
                </div>

                <div style="margin-top:1.25rem;">
                    <button class="btn btn-primary w-100" onclick="document.getElementById('compare-modal').classList.remove('flex');openBookingModal(${pkg.id}, '${pkg.name.replace(/'/g, "\\'")}', ${pkg.price}, '${pkg.destination.replace(/'/g, "\\'")}', '${(pkg.hotel_name || '').replace(/'/g, "\\'")}')">
                        Book This Package
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function setupModals() {
    // Close buttons
    const closeMap = [
        { btn: 'close-booking-modal', modal: 'booking-modal' },
        { btn: 'close-compare-modal', modal: 'compare-modal' },
        { btn: 'close-reviews-modal', modal: 'reviews-modal' },
        { btn: 'close-weather-modal', modal: 'weather-modal' },
        { btn: 'close-ticket-modal', modal: 'ticket-modal' }
    ];

    closeMap.forEach(({ btn, modal }) => {
        const el = document.getElementById(btn);
        if (el) {
            el.addEventListener('click', () => {
                document.getElementById(modal)?.classList.remove('flex');
            });
        }
    });

    // Close on background click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('flex');
        }
    });

    // Review form submit
    const reviewForm = document.getElementById('submit-review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', submitReview);
    }

    // Star rating buttons in review modal
    const starBtns = document.querySelectorAll('.star-rate-btn');
    starBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseInt(btn.dataset.val, 10);
            document.getElementById('review-rating-val').value = val;
            starBtns.forEach(b => {
                const bVal = parseInt(b.dataset.val, 10);
                b.classList.toggle('active', bVal <= val);
            });
            const labelMap = { 1: '1.0 - Poor', 2: '2.0 - Fair', 3: '3.0 - Good', 4: '4.0 - Very Good', 5: '5.0 - Exceptional' };
            const label = document.getElementById('star-rating-label');
            if (label) label.textContent = labelMap[val] || `${val}.0`;
        });
    });
}

function setupBookingCalculator() {
    const incBtn = document.getElementById('travelers-inc');
    const decBtn = document.getElementById('travelers-dec');
    
    if (incBtn) {
        incBtn.addEventListener('click', () => {
            const display = document.getElementById('travelers-count');
            let count = parseInt(display.textContent, 10) || 1;
            if (count < 10) {
                count++;
                display.textContent = count;
                updateBookingInvoice();
            }
        });
    }

    if (decBtn) {
        decBtn.addEventListener('click', () => {
            const display = document.getElementById('travelers-count');
            let count = parseInt(display.textContent, 10) || 1;
            if (count > 1) {
                count--;
                display.textContent = count;
                updateBookingInvoice();
            }
        });
    }

    document.querySelectorAll('.addon-checkbox').forEach(cb => {
        cb.addEventListener('change', () => updateBookingInvoice());
    });
}

function updateBookingInvoice() {
    const basePrice = parseFloat(document.getElementById('booking-base-price')?.value || '0');
    const travelersCount = parseInt(document.getElementById('travelers-count')?.textContent || '1', 10);
    
    const baseSubtotal = basePrice * travelersCount;

    let addonsSubtotal = 0;
    document.querySelectorAll('.addon-checkbox:checked').forEach(cb => {
        const itemPrice = parseFloat(cb.dataset.price || '0');
        const perPerson = cb.dataset.perPerson === 'true';
        addonsSubtotal += perPerson ? (itemPrice * travelersCount) : itemPrice;
    });

    const grandTotal = baseSubtotal + addonsSubtotal;
    const calcInput = document.getElementById('booking-total-calc');
    if (calcInput) calcInput.value = grandTotal.toFixed(2);

    const baseLabel = document.getElementById('invoice-base-label');
    if (baseLabel) baseLabel.textContent = `Base Tour (${travelersCount} traveler${travelersCount > 1 ? 's' : ''}):`;
    
    const baseAmount = document.getElementById('invoice-base-amount');
    if (baseAmount) baseAmount.textContent = formatPrice(baseSubtotal);

    const addonsRow = document.getElementById('invoice-addons-row');
    const addonsAmount = document.getElementById('invoice-addons-amount');
    if (addonsRow && addonsAmount) {
        if (addonsSubtotal > 0) {
            addonsRow.style.display = 'flex';
            addonsAmount.textContent = formatPrice(addonsSubtotal);
        } else {
            addonsRow.style.display = 'none';
        }
    }

    const priceDisplay = document.getElementById('booking-pkg-price');
    if (priceDisplay) priceDisplay.textContent = formatPrice(grandTotal);
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
        allLoadedPackages = packages;
        applyFiltersAndRender();
    } catch (err) {
        showAlert('Error loading packages', 'error');
    }
}

function applyFiltersAndRender() {
    const container = document.getElementById('packages-list');
    if (!container) return;

    let filtered = [...allLoadedPackages];

    // Filter by active AI Search results
    if (activeAISearchState && activeAISearchState.matchedIds && activeAISearchState.matchedIds.size > 0) {
        filtered = filtered.filter(p => activeAISearchState.matchedIds.has(p.id));
        const orderArr = Array.from(activeAISearchState.matchedIds);
        filtered.sort((a, b) => orderArr.indexOf(a.id) - orderArr.indexOf(b.id));
    }

    // Filter by category
    if (selectedCategory) {
        filtered = filtered.filter(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by price range
    const priceRange = document.getElementById('filter-price-range')?.value;
    if (priceRange) {
        if (priceRange === 'under-1000') filtered = filtered.filter(p => p.price < 1000);
        else if (priceRange === '1000-1500') filtered = filtered.filter(p => p.price >= 1000 && p.price <= 1500);
        else if (priceRange === '1500-2000') filtered = filtered.filter(p => p.price > 1500 && p.price <= 2000);
        else if (priceRange === 'above-2000') filtered = filtered.filter(p => p.price > 2000);
    }

    // Sort
    const sortBy = document.getElementById('filter-sort-by')?.value || 'recommended';
    if (sortBy === 'price-asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'date-soonest') {
        filtered.sort((a, b) => new Date(a.available_date) - new Date(b.available_date));
    } else if (sortBy === 'top-rated') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    displayedPackages = filtered;
    container.innerHTML = '';

    const badge = document.getElementById('destinations-count-badge');
    if (badge) {
        badge.textContent = `${filtered.length} Packages Found`;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray); padding: 3rem;">No packages matched your filters. Try choosing "All Styles" or resetting your search.</p>';
        return;
    }

    filtered.forEach(pkg => {
        const card = document.createElement('div');
        card.className = 'card package-card';
        const imgStyle = pkg.image_url ? `background-image: url(${pkg.image_url})` : '';
        const guides = {
            'switzerland': '/static/swiss.html',
            'maldives': '/static/maldives.html',
            'rome': '/static/rome.html',
            'singapore': '/static/singapore.html',
            'paris': '/static/paris.html',
            'tokyo': '/static/tokyo.html',
            'dubai': '/static/dubai.html',
            'amalfi': '/static/amalfi.html'
        };
        const destKey = Object.keys(guides).find(k => pkg.destination.toLowerCase().includes(k));
        const guideBtn = destKey ? `<a href="${guides[destKey]}" target="_blank" class="btn btn-secondary w-100" style="margin-bottom:0.5rem;text-align:center;text-decoration:none;display:inline-block;padding:0.4rem 0.8rem;font-size:0.85rem;">📖 View Destination Guide</a>` : '';
        
        const askAiBtn = `<button type="button" class="btn btn-secondary w-100" style="margin-bottom:0.5rem;padding:0.4rem 0.8rem;font-size:0.85rem;background:#f0fdfa;color:#0f766e;border:1px solid #99f6e4;" onclick="askAIAboutTrip('${pkg.name.replace(/'/g, "\\'")}', '${pkg.destination.replace(/'/g, "\\'")}', ${pkg.price})">✨ Ask AI Concierge</button>`;

        const isCompared = comparedPackageIds.has(pkg.id);
        const rating = pkg.rating ? pkg.rating.toFixed(1) : '4.9';
        const reviewCount = pkg.review_count || 12;

        const isAIMatched = activeAISearchState?.matchedIds?.has(pkg.id);
        const aiReason = activeAISearchState?.matchReasons?.[pkg.id];
        const aiBadgeTag = isAIMatched ? `<span class="ai-matched-tag"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Match</span>` : '';
        const aiHighlightHtml = aiReason ? `
            <div class="ai-card-match-highlight" title="TourGuide AI Selection Reason">
                <i class="fa-solid fa-wand-magic-sparkles"></i> <strong>AI Insight:</strong> ${escapeHTML(aiReason)}
            </div>
        ` : '';

        card.innerHTML = `
            <div class="package-card-header-overlay">
                <span class="package-category-tag">${pkg.category || 'Scenic Tour'}</span>
                ${aiBadgeTag}
                <label class="compare-checkbox-label">
                    <input type="checkbox" class="compare-chk" data-id="${pkg.id}" ${isCompared ? 'checked' : ''} onchange="togglePackageComparison(${pkg.id}, this.checked)">
                    Compare
                </label>
            </div>
            <div class="package-img" style="${imgStyle}"></div>
            <div class="package-title">${pkg.name}</div>
            
            <div class="package-rating-row">
                <button type="button" class="package-rating-btn" title="View traveler reviews" onclick="openReviewsModal(${pkg.id})">
                    ★ ${rating} (${reviewCount})
                </button>
                <button type="button" class="package-weather-btn" title="Check destination weather and season" onclick="openWeatherModal(${pkg.id})">
                    🌤️ Weather & Tips
                </button>
            </div>

            <div class="package-meta-tags">
                <span class="duration-tag">⏱️ ${pkg.duration_days || 7} Days</span>
                <span class="duration-tag">🏨 ${pkg.hotel_name || 'Selected Resort'}</span>
                <span class="duration-tag">📅 ${pkg.available_date}</span>
            </div>

            <div class="package-desc">${pkg.description}</div>
            ${aiHighlightHtml}
            <div class="package-price">${formatPrice(pkg.price)} <small style="font-size:0.75rem;color:var(--gray);font-weight:normal;">/ person</small></div>
            ${guideBtn}
            ${askAiBtn}
            <button class="btn btn-primary w-100" onclick="openBookingModal(${pkg.id}, '${pkg.name.replace(/'/g, "\\'")}', ${pkg.price}, '${pkg.destination.replace(/'/g, "\\'")}', '${(pkg.hotel_name || '').replace(/'/g, "\\'")}')">Book Now</button>
        `;
        container.appendChild(card);
    });
}

function openBookingModal(pkgId, pkgName, price, destination = '', hotelName = '') {
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
    document.getElementById('booking-base-price').value = price;
    document.getElementById('booking-pkg-name').textContent = pkgName;
    document.getElementById('booking-pkg-meta').textContent = `📍 ${destination} ${hotelName ? '• 🏨 ' + hotelName : ''}`;
    
    // Reset calculator
    document.getElementById('travelers-count').textContent = '1';
    document.querySelectorAll('.addon-checkbox').forEach(cb => cb.checked = false);
    updateBookingInvoice();

    document.getElementById('booking-modal').classList.add('flex');
    document.getElementById('booking-form').onsubmit = submitBooking;
}

async function submitBooking(e) {
    e.preventDefault();
    const pkgId = document.getElementById('booking-pkg-id').value;
    const method = document.getElementById('booking-method').value;
    const account = document.getElementById('booking-account').value;
    const travelersCount = parseInt(document.getElementById('travelers-count').textContent, 10) || 1;
    const totalAmount = parseFloat(document.getElementById('booking-total-calc').value) || 0;
    
    try {
        await apiCall('/bookings', 'POST', {
            package_id: parseInt(pkgId, 10),
            payment_method: method,
            account_number: account,
            travelers_count: travelersCount,
            total_amount: totalAmount
        });
        showAlert('🎉 Booking and payment confirmed successfully!');
        document.getElementById('booking-modal').classList.remove('flex');
        showView('tourist-dashboard-view');
    } catch (err) {
        showAlert(err.message, 'error');
    }
}

/* ==========================================================================
   Reviews & Experiences Modal Functions
   ========================================================================== */

let activeReviewPackageId = null;

async function openReviewsModal(pkgId) {
    activeReviewPackageId = pkgId;
    const modal = document.getElementById('reviews-modal');
    const header = document.getElementById('reviews-header-banner');
    const list = document.getElementById('reviews-list-container');
    const countBadge = document.getElementById('reviews-count-badge');
    const pkgIdInput = document.getElementById('review-pkg-id');

    if (!modal) return;
    modal.classList.add('flex');
    if (pkgIdInput) pkgIdInput.value = pkgId;

    const pkg = allLoadedPackages.find(p => p.id === pkgId);
    const pkgTitle = pkg ? pkg.name : `Package #${pkgId}`;
    const destination = pkg ? pkg.destination : '';

    if (header) {
        header.innerHTML = `
            <div>
                <h2 style="font-size:1.25rem;margin-bottom:0.25rem;">${pkgTitle}</h2>
                <div style="font-size:0.88rem;color:var(--gray);">📍 ${destination}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:1.5rem;font-weight:800;color:#f59e0b;">★ ${pkg?.rating ? pkg.rating.toFixed(1) : '5.0'}</div>
                <div style="font-size:0.8rem;color:var(--gray);">Overall Rating</div>
            </div>
        `;
    }

    if (list) {
        list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:1.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading traveler reviews...</p>';
    }

    try {
        const reviews = await apiCall(`/packages/${pkgId}/reviews`);
        if (countBadge) countBadge.textContent = `${reviews.length} reviews`;

        if (!reviews || reviews.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:1.5rem;">Be the first adventurer to share a review for this package!</p>';
            return;
        }

        let html = '';
        reviews.forEach(r => {
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Verified Traveler';
            html += `
                <div class="review-item">
                    <div class="review-item-header">
                        <span class="reviewer-name">👤 ${r.tourist_name} <span class="badge" style="background:#d1fae5;color:#065f46;font-size:0.7rem;padding:0.15rem 0.4rem;">Verified Traveler</span></span>
                        <span class="review-date">${dateStr}</span>
                    </div>
                    <div class="review-stars">${stars} (${r.rating}/5)</div>
                    <div class="review-comment-text">${escapeHTML(r.comment)}</div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (err) {
        list.innerHTML = `<p style="color:#b91c1c;padding:1rem;">Failed to load reviews: ${escapeHTML(err.message)}</p>`;
    }
}

async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) {
        showAlert('Please log in as a tourist to leave a review.', 'error');
        showView('login-view');
        return;
    }

    const pkgId = activeReviewPackageId;
    const rating = parseInt(document.getElementById('review-rating-val').value, 10) || 5;
    const comment = document.getElementById('review-comment').value.trim();

    if (!comment) return;

    try {
        await apiCall(`/packages/${pkgId}/reviews`, 'POST', { rating, comment });
        showAlert('🎉 Thank you! Your review has been published.');
        document.getElementById('review-comment').value = '';
        openReviewsModal(pkgId);
        loadPackages(); // Update rating stars on package cards
    } catch (err) {
        showAlert(err.message, 'error');
    }
}

/* ==========================================================================
   Weather & Seasonality Tips Modal
   ========================================================================== */

function openWeatherModal(pkgId) {
    const pkg = allLoadedPackages.find(p => p.id === pkgId);
    if (!pkg) return;

    const weather = pkg.weather || {
        temp: '22°C / 72°F',
        condition: 'Sunny & Mild',
        season: 'Ideal travel window with pleasant skies.',
        tips: 'Pack comfortable walking shoes, sunscreen, and layers for evening excursions.'
    };

    const modal = document.getElementById('weather-modal');
    const body = document.getElementById('weather-modal-body');
    if (!modal || !body) return;

    body.innerHTML = `
        <div class="weather-card-hero">
            <div style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.9;">Destination Climate Guide</div>
            <h2 style="margin:0.25rem 0;color:white;">📍 ${pkg.destination}</h2>
            <div class="weather-temp-big">${weather.temp}</div>
            <div style="font-size:1.1rem;font-weight:600;">🌤️ ${weather.condition}</div>
        </div>

        <div class="weather-grid-boxes">
            <div class="weather-info-box">
                <h4>🌿 Best Season & Conditions</h4>
                <p style="font-size:0.88rem;color:#334155;margin:0;">${weather.season}</p>
            </div>
            <div class="weather-info-box">
                <h4>🎒 Recommended Attire & Gear</h4>
                <p style="font-size:0.88rem;color:#334155;margin:0;">${weather.tips}</p>
            </div>
        </div>

        <div class="card" style="background:#f0fdfa;border:1px solid #99f6e4;padding:0.85rem;margin-bottom:0;">
            <div style="font-weight:700;color:#0f766e;font-size:0.88rem;margin-bottom:0.25rem;">✨ Concierge Travel Advice</div>
            <p style="font-size:0.85rem;color:#134e4a;margin:0;">
                All our selected partner hotels offer luggage storage, high-speed Wi-Fi, and 24/7 concierge assistance for bookings and localized day tours.
            </p>
        </div>
    `;

    modal.classList.add('flex');
}

/* ==========================================================================
   Printable E-Ticket Voucher Modal
   ========================================================================== */

async function openTicketModal(bookingId) {
    const modal = document.getElementById('ticket-modal');
    const body = document.getElementById('ticket-modal-body');
    if (!modal || !body) return;

    body.innerHTML = '<p style="text-align:center;padding:2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Preparing official ticket voucher...</p>';
    modal.classList.add('flex');

    try {
        const bookings = await apiCall('/bookings/me');
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) throw new Error('Booking record not found.');

        const barcodeNum = `7892${String(booking.id).padStart(6, '0')}4519`;

        body.innerHTML = `
            <div class="ticket-container">
                <div class="ticket-brand">
                    <div>
                        <div style="font-size:1.25rem;font-weight:800;color:var(--primary);"><i class="fa-solid fa-compass"></i> TourManager Official Voucher</div>
                        <div style="font-size:0.82rem;color:var(--gray);">Electronic Boarding Pass &amp; Hotel Check-In Certificate</div>
                    </div>
                    <div>
                        <span class="ticket-status-pill">✓ ${booking.status}</span>
                    </div>
                </div>

                <div class="ticket-grid-details">
                    <div class="ticket-detail-item">
                        <label>Booking Reference</label>
                        <span>BK-${booking.id}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <label>Lead Passenger</label>
                        <span>${currentUser?.name || 'Verified Tourist'}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <label>Tour Package</label>
                        <span>${booking.package_name}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <label>Departure Date</label>
                        <span>📅 ${booking.travel_date}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <label>Payment Reference</label>
                        <span style="font-family:monospace;font-size:0.9rem;">${booking.payment_reference || 'REF-VERIFIED'}</span>
                    </div>
                    <div class="ticket-detail-item">
                        <label>Total Paid</label>
                        <span style="color:var(--primary);">${formatPrice(booking.amount)}</span>
                    </div>
                </div>

                <div class="ticket-barcode-box">
                    <div>
                        <div style="font-size:0.75rem;text-transform:uppercase;color:var(--gray);font-weight:700;">Digital Verification Pass</div>
                        <div class="simulated-barcode">||| | |||| | ||||| || |||</div>
                        <div style="font-family:monospace;font-size:0.8rem;color:#64748b;">${barcodeNum}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.75rem;color:var(--gray);display:block;">24/7 Global Helpline:</span>
                        <strong style="color:var(--primary);">+1 (800) 555-TOUR</strong>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        body.innerHTML = `<p style="color:#b91c1c;padding:1.5rem;">Failed to load ticket voucher: ${escapeHTML(err.message)}</p>`;
    }
}

async function loadTouristDashboard() {
    try {
        const [bookings, notifications] = await Promise.all([
            apiCall('/bookings/me'),
            apiCall('/notifications')
        ]);
        
        const tbody = document.getElementById('my-bookings-list');
        tbody.innerHTML = '';

        const printBtn = document.getElementById('print-ticket-btn');
        if (printBtn && !printBtn.dataset.bound) {
            printBtn.dataset.bound = 'true';
            printBtn.addEventListener('click', () => window.print());
        }

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:2rem;">No bookings yet. Explore our packages and start your journey!</td></tr>';
        }

        bookings.forEach(b => {
            const tr = document.createElement('tr');
            let actions = '';
            if (b.status === 'confirmed') {
                actions = `
                    <button class="btn btn-primary" onclick="openTicketModal(${b.id})" style="padding:0.35rem 0.7rem;font-size:0.85rem;margin-right:0.35rem;">🎫 E-Ticket</button>
                    <button class="btn btn-secondary" onclick="window.open('/api/bookings/${b.id}/ticket?token=${token}', '_blank')" style="padding:0.35rem 0.6rem;font-size:0.85rem;margin-right:0.35rem;" title="Raw Certificate / Receipt">📄</button>
                    <button class="btn btn-danger" onclick="cancelBooking(${b.id})" style="padding:0.35rem 0.6rem;font-size:0.85rem;">Cancel</button>
                `;
            } else {
                actions = `<span class="badge" style="background:#fee2e2;color:#991b1b;padding:0.25rem 0.5rem;font-size:0.8rem;">Cancelled</span>`;
            }
            tr.innerHTML = `
                <td><strong>BK-${b.id}</strong></td>
                <td>${b.package_name}</td>
                <td>${b.travel_date}</td>
                <td><span class="badge" style="${b.status === 'confirmed' ? 'background:#d1fae5;color:#065f46;' : 'background:#fee2e2;color:#991b1b;'}padding:0.2rem 0.5rem;border-radius:12px;font-size:0.8rem;text-transform:capitalize;">${b.status}</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });

        const notifContainer = document.getElementById('notifications-list');
        notifContainer.innerHTML = '';
        if (notifications.length === 0) {
            notifContainer.innerHTML = '<p style="color:var(--gray);padding:1rem;">No notifications at this time.</p>';
        }
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

/* ==========================================================================
   AI Travel Assistant Client Functions
   ========================================================================== */

let aiChatHistory = [];

function setupAIAssistant() {
    const trigger = document.getElementById('ai-floating-trigger');
    const box = document.getElementById('ai-floating-box');
    const closeBtn = document.getElementById('ai-box-close');
    const clearBtn = document.getElementById('ai-box-clear');
    const navAiBtn = document.getElementById('nav-ai-btn');
    const chatForm = document.getElementById('ai-chat-form');
    const inlineForm = document.getElementById('ai-inline-form');

    if (trigger) {
        trigger.addEventListener('click', () => {
            toggleAIAssistant();
        });
    }

    if (navAiBtn) {
        navAiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAIAssistant(true);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toggleAIAssistant(false);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            resetAIChat();
        });
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('ai-chat-input');
            const message = input.value.trim();
            if (!message) return;
            input.value = '';
            handleUserAIMessage(message);
        });
    }

    if (inlineForm) {
        inlineForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('ai-inline-input');
            const message = input.value.trim();
            if (!message) return;
            input.value = '';
            toggleAIAssistant(true);
            handleUserAIMessage(message);
        });
    }

    // Quick prompt chips
    document.querySelectorAll('.ai-chip, .ai-mini-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            if (prompt) {
                toggleAIAssistant(true);
                handleUserAIMessage(prompt);
            }
        });
    });
}

function toggleAIAssistant(forceState) {
    const box = document.getElementById('ai-floating-box');
    if (!box) return;
    const shouldOpen = typeof forceState === 'boolean' ? forceState : box.classList.contains('hidden');
    if (shouldOpen) {
        box.classList.remove('hidden');
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            if (input) input.focus();
        }, 100);
    } else {
        box.classList.add('hidden');
    }
}

function resetAIChat() {
    aiChatHistory = [];
    const container = document.getElementById('ai-chat-messages');
    if (container) {
        container.innerHTML = `
            <div class="ai-msg bot-msg">
                <div class="msg-bubble">
                    👋 Chat cleared. How can <strong>TourGuide AI</strong> assist your travel plans today? Ask for destinations, itineraries, or package details!
                </div>
            </div>
        `;
    }
}

function askAIAboutTrip(name, destination, price) {
    toggleAIAssistant(true);
    const query = `Tell me more about the "${name}" tour package in ${destination} ($${price}). What are the key highlights and what should I prepare?`;
    handleUserAIMessage(query);
}

async function handleUserAIMessage(message) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    // Append User Message
    const userEl = document.createElement('div');
    userEl.className = 'ai-msg user-msg';
    userEl.innerHTML = `<div class="msg-bubble">${escapeHTML(message)}</div>`;
    container.appendChild(userEl);
    container.scrollTop = container.scrollHeight;

    // Append typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-msg bot-msg typing-bubble-wrapper';
    typingEl.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;

    try {
        const payload = {
            message,
            history: aiChatHistory.slice(-8)
        };

        const res = await fetch('/api/ai/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        typingEl.remove();

        if (!res.ok) {
            throw new Error(data.detail || 'Unable to fetch response from AI Assistant.');
        }

        const reply = data.reply || "I'm ready to assist with your journey! Feel free to ask about any destination.";
        
        // Update history
        aiChatHistory.push({ role: 'user', text: message });
        aiChatHistory.push({ role: 'model', text: reply });

        // Append Bot Message
        const botEl = document.createElement('div');
        botEl.className = 'ai-msg bot-msg';
        botEl.innerHTML = `<div class="msg-bubble">${formatMarkdown(reply)}</div>`;
        container.appendChild(botEl);
        container.scrollTop = container.scrollHeight;

    } catch (err) {
        typingEl.remove();
        const errEl = document.createElement('div');
        errEl.className = 'ai-msg bot-msg';
        errEl.innerHTML = `<div class="msg-bubble" style="color:#b91c1c;background:#fef2f2;border-color:#fecaca;">
            ⚠️ <em>${escapeHTML(err.message || 'Error communicating with assistant. Please try again.')}</em>
        </div>`;
        container.appendChild(errEl);
        container.scrollTop = container.scrollHeight;
    }
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHTML(text);

    // Bolds: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italics: *text*
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Split lines and handle lists
    const lines = html.split('\n');
    let inList = false;
    let result = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList) {
                result += '<ul>';
                inList = true;
            }
            result += `<li>${line.substring(2).trim()}</li>`;
        } else {
            if (inList) {
                result += '</ul>';
                inList = false;
            }
            if (line) {
                result += `<p>${line}</p>`;
            }
        }
    }
    if (inList) {
        result += '</ul>';
    }

    return result;
}

/* ==========================================================================
   AI Natural Language Record Search & Intelligent Matching
   ========================================================================== */
async function handleAISearch(query) {
    const searchInput = document.getElementById('search-dest');
    const finalQuery = (query || (searchInput ? searchInput.value : '')).trim();

    if (!finalQuery) {
        showAlert('Please enter travel preferences, destination, or budget to search with TourGuide AI.', 'error');
        if (searchInput) searchInput.focus();
        return;
    }

    if (searchInput) {
        searchInput.value = finalQuery;
    }

    const loadingEl = document.getElementById('ai-search-loading');
    const bannerEl = document.getElementById('ai-search-result-banner');
    const emptyEl = document.getElementById('ai-search-empty');
    const listEl = document.getElementById('packages-list');

    // Display loading state, hide previous banners
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (bannerEl) bannerEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');

    try {
        const res = await fetch('/api/ai/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: finalQuery })
        });

        const data = await res.json();
        if (loadingEl) loadingEl.classList.add('hidden');

        if (!res.ok) {
            throw new Error(data.detail || 'AI search request failed.');
        }

        const matchedIds = data.matched_package_ids || [];
        const matchReasons = data.match_reasons || {};

        if (matchedIds.length === 0) {
            if (emptyEl) {
                emptyEl.classList.remove('hidden');
                const msg = document.getElementById('ai-empty-message');
                if (msg) {
                    msg.textContent = data.summary || `No tour packages in our catalog matched all those exact criteria for "${finalQuery}".`;
                }
            }
            if (listEl) listEl.innerHTML = '';
            const countBadge = document.getElementById('destinations-count-badge');
            if (countBadge) countBadge.textContent = '0 Packages Found';
            activeAISearchState = null;
            return;
        }

        activeAISearchState = {
            matchedIds: new Set(matchedIds.map(Number)),
            matchReasons,
            summary: data.summary,
            criteria: data.criteria_detected || {},
            query: finalQuery
        };

        if (bannerEl) {
            bannerEl.classList.remove('hidden');
            const summaryEl = document.getElementById('ai-banner-summary');
            if (summaryEl) summaryEl.textContent = data.summary;

            const countEl = document.getElementById('ai-banner-count');
            if (countEl) countEl.textContent = `${matchedIds.length} tour${matchedIds.length > 1 ? 's' : ''} matched`;

            const tagsEl = document.getElementById('ai-banner-tags');
            if (tagsEl) {
                let tagsHtml = `<span class="ai-criteria-tag"><i class="fa-solid fa-magnifying-glass"></i> "${escapeHTML(finalQuery)}"</span>`;
                if (data.criteria_detected?.budget) {
                    tagsHtml += `<span class="ai-criteria-tag"><i class="fa-solid fa-tag"></i> Budget: ${escapeHTML(data.criteria_detected.budget)}</span>`;
                }
                if (data.criteria_detected?.travel_style) {
                    tagsHtml += `<span class="ai-criteria-tag"><i class="fa-solid fa-compass"></i> Style: ${escapeHTML(data.criteria_detected.travel_style)}</span>`;
                }
                if (data.criteria_detected?.theme) {
                    tagsHtml += `<span class="ai-criteria-tag"><i class="fa-solid fa-sparkles"></i> Theme: ${escapeHTML(data.criteria_detected.theme)}</span>`;
                }
                tagsEl.innerHTML = tagsHtml;
            }
        }

        // Merge updated formatted packages if returned
        if (Array.isArray(data.packages) && data.packages.length > 0) {
            data.packages.forEach(pkg => {
                const idx = allLoadedPackages.findIndex(p => p.id === pkg.id);
                if (idx !== -1) {
                    allLoadedPackages[idx] = { ...allLoadedPackages[idx], ...pkg };
                }
            });
        }

        applyFiltersAndRender();
        bannerEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
        if (loadingEl) loadingEl.classList.add('hidden');
        showAlert(err.message || 'Error executing AI search. Please try again.', 'error');
    }
}

function resetAISearch(reload = true) {
    activeAISearchState = null;
    document.getElementById('ai-search-result-banner')?.classList.add('hidden');
    document.getElementById('ai-search-empty')?.classList.add('hidden');
    document.getElementById('ai-search-loading')?.classList.add('hidden');
    if (reload) {
        const searchInput = document.getElementById('search-dest');
        if (searchInput) searchInput.value = '';
        const dateInput = document.getElementById('search-date');
        if (dateInput) dateInput.value = '';
        const priceSelect = document.getElementById('filter-price-range');
        if (priceSelect) priceSelect.value = '';
        loadPackages('/packages');
    }
}

window.triggerAISearchPrompt = function(query) {
    handleAISearch(query);
};

window.resetToAllPackages = function() {
    resetAISearch(true);
};

