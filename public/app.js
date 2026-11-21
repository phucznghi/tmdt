import {api,esc,busy,redirectForLogin} from '/shared.js';
import {mountFulfillment} from '/checkout.js';

        // Safe SVG Data URI Fallback Image so NO broken images ever appear
        window.FALLBACK_IMG = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231B4332'/%3E%3Cstop offset='100%25' stop-color='%232D6A4F'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='500' fill='url(%23g)'/%3E%3Ctext x='50%25' y='48%25' dominant-baseline='middle' text-anchor='middle' fill='%23FAF9F6' font-family='sans-serif' font-weight='bold' font-size='22'%3EM%E1%BB%98C V%E1%BA%A2I%3C/text%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%23F59E0B' font-family='sans-serif' font-size='12' letter-spacing='3'%3EVERDANT%3C/text%3E%3C/svg%3E";

        document.addEventListener('DOMContentLoaded', async () => {
            try {
            const me = await api('/me');
            const management=me.user&&me.user.role!=='customer';
            document.body.classList.toggle('management-mode',!!management);
            const policyStyle=document.createElement('style');policyStyle.textContent='.management-mode #open-cart-btn,.management-mode [data-quickadd-id],.management-mode #quickview-body div:has(> #qv-add-btn),.management-mode .portal-open-btn[data-portal-tab="orders"]{display:none!important}';document.head.append(policyStyle);
            const textWalker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let textNode;
            while(textNode=textWalker.nextNode())textNode.nodeValue=textNode.nodeValue.replace('Miễn phí vận chuyển toàn quốc cho đơn hàng từ 498.000đ.','Miễn phí nhận tại cửa hàng và giao trong TP.HCM.').replace('Miễn phí vận chuyển đơn từ 498K','Miễn phí giao trong TP.HCM');
            const escapeTree = value => typeof value === 'string' ? esc(value) : Array.isArray(value) ? value.map(escapeTree) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k,escapeTree(v)])) : value;

            // --- PRODUCT DATASET ---
            const PRODUCTS = escapeTree(await api('/products'));

            // --- APPLICATION STATE ---
            const state = {
                audience: 'all',
                category: 'all',
                specialTag: null,
                search: '',
                sort: 'featured',
                activeColorIndex: {}, // productId -> colorIndex
                cart: [],
                promoApplied: false,
                user: me.user,
                orders: []
            };


            const formatVND = (num) => new Intl.NumberFormat('vi-VN').format(num) + 'đ';

            // --- TOAST HELPER ---
            function showToast(message) {
                const container = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = 'bg-forest text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl border border-forest-light flex items-center gap-2.5 animate-modal';
                toast.innerHTML = `<span class="text-amberbrand-light">✓</span><span>${esc(message)}</span>`;
                container.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transition = 'opacity 0.25s';
                    setTimeout(() => toast.remove(), 260);
                }, 2600);
            }

            // --- 1. MEGA MENU CONTROLS ---
            const megaBtn = document.getElementById('mega-menu-toggle');
            const megaDropdown = document.getElementById('mega-menu-dropdown');
            const megaBackdrop = document.getElementById('mega-menu-backdrop');
            const iconBars = document.getElementById('menu-icon-bars');
            const iconClose = document.getElementById('menu-icon-close');

            function openMegaMenu() {
                megaDropdown.classList.remove('hidden');
                megaBackdrop.classList.remove('hidden');
                iconBars.classList.add('hidden');
                iconClose.classList.remove('hidden');
            }

            function closeMegaMenu() {
                megaDropdown.classList.add('hidden');
                megaBackdrop.classList.add('hidden');
                iconBars.classList.remove('hidden');
                iconClose.classList.add('hidden');
            }

            megaBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (megaDropdown.classList.contains('hidden')) openMegaMenu();
                else closeMegaMenu();
            });

            megaBackdrop.addEventListener('click', closeMegaMenu);

            document.querySelectorAll('.mega-cat-link').forEach(btn => {
                btn.addEventListener('click', () => {
                    state.audience = btn.dataset.audience || 'all';
                    state.category = btn.dataset.category || 'all';
                    state.specialTag = null;
                    closeMegaMenu();
                    syncFilterPills();
                    renderCatalog();
                    document.getElementById('catalog-section').scrollIntoView({ behavior: 'smooth' });
                });
            });

            document.querySelectorAll('.mega-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.quickFilter;
                    state.audience = 'all';
                    state.category = 'all';
                    state.specialTag = filter;
                    closeMegaMenu();
                    syncFilterPills();
                    renderCatalog();
                    document.getElementById('catalog-section').scrollIntoView({ behavior: 'smooth' });
                });
            });

            // Info Modals from Mega Menu (Stores / News / Uniform)
            const infoModal = document.getElementById('info-modal');
            const infoContent = document.getElementById('info-modal-content');
            const INFO_DATA = {
                stores: {
                    title: "Hệ Thống Cửa Hàng MỘC VẢI",
                    body: `<div class="space-y-3 text-sm text-gray-600 mt-3">
                        <div class="p-3.5 rounded-2xl bg-cream border border-cream-border">
                            <strong class="text-forest block">📍 MỘC VẢI Flagship Quận 1</strong>
                            <span>128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM • 08:30 - 22:00</span>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-cream border border-cream-border">
                            <strong class="text-forest block">📍 MỘC VẢI Cầu Giấy Hà Nội</strong>
                            <span>215 Cầu Giấy, Phường Dịch Vọng, Hà Nội • 08:30 - 22:00</span>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-cream border border-cream-border">
                            <strong class="text-forest block">📍 MỘC VẢI Hải Châu Đà Nẵng</strong>
                            <span>86 Lê Duẩn, Quận Hải Châu, Đà Nẵng • 08:30 - 22:00</span>
                        </div>
                    </div>`
                },
                news: {
                    title: "Tin Tức & Câu Chuyện Chất Liệu Xanh",
                    body: `<div class="space-y-3 text-sm text-gray-600 mt-3">
                        <p class="p-3.5 rounded-2xl bg-forest-50 border border-forest/15">
                            <strong class="text-forest block mb-1">🌿 Công nghệ Sợi Cafe tái chế từ bã cà phê Việt</strong>
                            Giúp khử mùi tự nhiên, khô nhanh và giảm rác thải nhựa ra môi trường.
                        </p>
                        <p class="p-3.5 rounded-2xl bg-amberbrand-50 border border-amberbrand/20">
                            <strong class="text-amberbrand-dark block mb-1">☀️ Airycool - Giải pháp làm mát ngày hè</strong>
                            Cấu trúc sợi dẫn nhiệt thông minh hạ nhiệt độ bề mặt da ngay khi mặc.
                        </p>
                    </div>`
                },
                uniform: {
                    title: "Đồng Phục Doanh Nghiệp MỘC VẢI",
                    body: `<div class="space-y-3 text-sm text-gray-600 mt-3">
                        <p>Thiết kế & sản xuất áo Polo đồng phục chất liệu Sợi Cafe, Airycool cao cấp cho doanh nghiệp từ 20 - 10.000 áo.</p>
                        <ul class="list-disc pl-5 space-y-1 text-gray-700 font-medium">
                            <li>Miễn phí thiết kế mẫu 3D & may mẫu thử tận nơi</li>
                            <li>In/thêu logo sắc nét, bảo hành độ bền màu 2 năm</li>
                            <li>Hotline tư vấn đồng phục: <strong class="text-forest">1800 2086</strong></li>
                        </ul>
                    </div>`
                }
            };

            INFO_DATA.stores.body=`<div class="space-y-3 text-sm text-gray-600 mt-3"><div class="p-3.5 rounded-2xl bg-cream border border-cream-border"><strong class="text-forest block">Cửa hàng MỘC VẢI</strong><p>${esc(me.config.fulfillment.storeAddress)}</p></div></div>`;
            document.querySelectorAll('.mega-info-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.dataset.infoModal;
                    const item = INFO_DATA[key];
                    if (!item) return;
                    closeMegaMenu();
                    infoContent.innerHTML = `<h3 class="font-display font-extrabold text-xl text-forest">${item.title}</h3>${item.body}`;
                    infoModal.classList.remove('hidden');
                    infoModal.classList.add('flex');
                });
            });

            document.getElementById('close-info-btn').addEventListener('click', () => {
                infoModal.classList.add('hidden');
                infoModal.classList.remove('flex');
            });

            // --- 2. HERO BANNER SLIDER ---
            let currentSlide = 0;
            const slides = document.querySelectorAll('.hero-slide');
            const dots = document.querySelectorAll('.hero-dot');

            function showSlide(idx) {
                currentSlide = (idx + slides.length) % slides.length;
                slides.forEach((s, i) => {
                    if (i === currentSlide) {
                        s.classList.remove('opacity-0', 'pointer-events-none');
                        s.classList.add('opacity-100');
                    } else {
                        s.classList.add('opacity-0', 'pointer-events-none');
                        s.classList.remove('opacity-100');
                    }
                });
                dots.forEach((d, i) => {
                    d.className = i === currentSlide
                        ? 'hero-dot w-6 h-2 rounded-full bg-amberbrand transition-all'
                        : 'hero-dot w-2 h-2 rounded-full bg-white/60 hover:bg-white transition-all';
                });
            }

            document.getElementById('hero-prev-btn').addEventListener('click', () => showSlide(currentSlide - 1));
            document.getElementById('hero-next-btn').addEventListener('click', () => showSlide(currentSlide + 1));
            dots.forEach(dot => {
                dot.addEventListener('click', () => showSlide(Number(dot.dataset.slideDot)));
            });

            document.querySelectorAll('.hero-cta-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    state.audience = btn.dataset.filterAudience || 'all';
                    state.category = btn.dataset.filterCategory || 'all';
                    state.specialTag = null;
                    syncFilterPills();
                    renderCatalog();
                    document.getElementById('catalog-section').scrollIntoView({ behavior: 'smooth' });
                });
            });

            // Auto-advance hero every 6s
            setInterval(() => showSlide(currentSlide + 1), 6000);

            // --- 3. FLASH SALE COUNTDOWN & RENDER ---
            let fsSecondsRemaining = (2 * 3600) + (22 * 60) + 21;
            const fsHoursEl = document.getElementById('fs-hours');
            const fsMinutesEl = document.getElementById('fs-minutes');
            const fsSecondsEl = document.getElementById('fs-seconds');

            setInterval(() => {
                if (fsSecondsRemaining <= 0) fsSecondsRemaining = 3 * 3600;
                fsSecondsRemaining--;
                fsHoursEl.textContent = String(Math.floor(fsSecondsRemaining / 3600)).padStart(2, '0');
                fsMinutesEl.textContent = String(Math.floor((fsSecondsRemaining % 3600) / 60)).padStart(2, '0');
                fsSecondsEl.textContent = String(fsSecondsRemaining % 60).padStart(2, '0');
            }, 1000);

            function renderFlashSale() {
                const grid = document.getElementById('flash-sale-grid');
                const flashProducts = PRODUCTS.filter(p => p.flashSale).slice(0, 5);
                grid.innerHTML = flashProducts.map(p => {
                    const color = p.colors[0];
                    const soldPercent = Math.min(92, Math.max(48, Math.round((p.sold / 1500) * 100)));
                    return `
                        <div class="group bg-white rounded-2xl border border-cream-border hover:border-forest/40 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col">
                            <div class="relative aspect-[4/5] bg-cream overflow-hidden cursor-pointer" data-quickview-id="${p.id}">
                                <img src="${color.img}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.onerror=null;this.src=window.FALLBACK_IMG">
                                <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amberbrand text-white text-[11px] font-extrabold shadow-xs">${p.discount}</span>
                                <button type="button" data-quickadd-id="${p.id}" class="quickadd-btn absolute bottom-2.5 left-2.5 right-2.5 py-2 rounded-xl bg-forest/95 hover:bg-forest text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition shadow-md cursor-pointer">
                                    + Thêm nhanh
                                </button>
                            </div>
                            <div class="p-3 flex-1 flex flex-col justify-between">
                                <h3 class="text-xs sm:text-sm font-semibold text-gray-800 hover:text-forest line-clamp-2 cursor-pointer" data-quickview-id="${p.id}">${p.name}</h3>
                                <div class="mt-2">
                                    <div class="flex items-baseline gap-1.5 flex-wrap">
                                        <span class="font-display font-extrabold text-sm sm:text-base text-amberbrand">${formatVND(p.price)}</span>
                                        <span class="text-[11px] text-gray-400 line-through">${formatVND(p.originalPrice)}</span>
                                    </div>
                                    <div class="mt-2 w-full h-4 rounded-full bg-amberbrand-50 overflow-hidden relative flex items-center justify-center">
                                        <div class="absolute left-0 top-0 bottom-0 bg-amberbrand rounded-full" style="width: ${soldPercent}%"></div>
                                        <span class="relative z-10 text-[9px] font-extrabold text-white uppercase tracking-wider drop-shadow-xs">Đã bán ${p.sold}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // --- 4. CATALOG FILTERING, SEARCH & RENDER ---
            function syncFilterPills() {
                document.querySelectorAll('.filter-pill').forEach(pill => {
                    const type = pill.dataset.filterType;
                    const val = pill.dataset.filterVal;
                    const isActive =
                        (type === 'all' && state.audience === 'all' && state.category === 'all' && !state.specialTag) ||
                        (type === 'audience' && state.audience === val && state.category === 'all') ||
                        (type === 'category' && state.category === val);

                    pill.className = isActive
                        ? 'filter-pill shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-forest text-white shadow-xs transition cursor-pointer'
                        : 'filter-pill shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white text-gray-700 border border-cream-border hover:border-forest transition cursor-pointer';
                });
            }

            document.querySelectorAll('.filter-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const type = pill.dataset.filterType;
                    const val = pill.dataset.filterVal;
                    state.specialTag = null;
                    if (type === 'all') {
                        state.audience = 'all';
                        state.category = 'all';
                    } else if (type === 'audience') {
                        state.audience = val;
                        state.category = 'all';
                    } else if (type === 'category') {
                        state.audience = 'all';
                        state.category = val;
                    }
                    syncFilterPills();
                    renderCatalog();
                });
            });

            // Live Search
            const desktopSearch = document.getElementById('desktop-search-input');
            const mobileSearch = document.getElementById('mobile-search-input');
            const clearSearchBtn = document.getElementById('clear-search-btn');

            function handleSearchInput(value) {
                state.search = value;
                desktopSearch.value = value;
                mobileSearch.value = value;
                if (value.trim().length > 0) clearSearchBtn.classList.remove('hidden');
                else clearSearchBtn.classList.add('hidden');
                renderCatalog();
            }

            desktopSearch.addEventListener('input', (e) => handleSearchInput(e.target.value));
            mobileSearch.addEventListener('input', (e) => handleSearchInput(e.target.value));
            clearSearchBtn.addEventListener('click', () => handleSearchInput(''));

            document.getElementById('mobile-search-toggle').addEventListener('click', () => {
                const wrapper = document.getElementById('mobile-search-wrapper');
                wrapper.classList.toggle('hidden');
                if (!wrapper.classList.contains('hidden')) mobileSearch.focus();
            });

            document.getElementById('sort-select').addEventListener('change', (e) => {
                state.sort = e.target.value;
                renderCatalog();
            });

            function resetAllFilters() {
                state.audience = 'all';
                state.category = 'all';
                state.specialTag = null;
                handleSearchInput('');
                syncFilterPills();
                renderCatalog();
            }

            document.getElementById('reset-filters-btn').addEventListener('click', resetAllFilters);
            document.getElementById('brand-logo-btn').addEventListener('click', () => {
                closeMegaMenu();
                resetAllFilters();
            });

            function renderCatalog() {
                let filtered = PRODUCTS.filter(p => {
                    const matchAudience = state.audience === 'all' || p.audience === state.audience;
                    const matchCategory = state.category === 'all' || p.category === state.category;
                    let matchSpecial = true;
                    if (state.specialTag === 'sale') matchSpecial = p.flashSale || p.badge === 'Sale Sốc';
                    if (state.specialTag === 'new') matchSpecial = p.badge === 'Mới về';
                    if (state.specialTag === 'connect') matchSpecial = p.category === 'Áo Polo' || p.badge === 'BST Gia Đình';

                    const q = state.search.trim().toLowerCase();
                    const matchSearch = !q ||
                        p.name.toLowerCase().includes(q) ||
                        p.category.toLowerCase().includes(q) ||
                        p.audience.toLowerCase().includes(q) ||
                        p.fabric.toLowerCase().includes(q);

                    return matchAudience && matchCategory && matchSpecial && matchSearch;
                });

                if (state.sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
                else if (state.sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
                else if (state.sort === 'bestseller') filtered.sort((a, b) => b.sold - a.sold);

                const grid = document.getElementById('product-catalog-grid');
                const emptyState = document.getElementById('empty-catalog-state');
                document.getElementById('catalog-count-label').textContent = `Hiển thị ${filtered.length} sản phẩm`;

                if (filtered.length === 0) {
                    grid.innerHTML = '';
                    emptyState.classList.remove('hidden');
                    return;
                }
                emptyState.classList.add('hidden');

                grid.innerHTML = filtered.map(p => {
                    const cIdx = state.activeColorIndex[p.id] || 0;
                    const activeColor = p.colors[cIdx] || p.colors[0];

                    return `
                        <article class="group bg-white rounded-2xl border border-cream-border hover:border-forest/40 overflow-hidden shadow-2xs hover:shadow-lg transition flex flex-col">
                            <!-- Image Container -->
                            <div class="relative aspect-[4/5] bg-cream overflow-hidden cursor-pointer" data-quickview-id="${p.id}">
                                <img id="card-img-${p.id}" src="${activeColor.img}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.onerror=null;this.src=window.FALLBACK_IMG">
                                
                                <!-- Badges -->
                                <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                                    <span class="px-2.5 py-0.5 rounded-full bg-forest text-white text-[10px] font-bold shadow-xs">${p.badge}</span>
                                </div>
                                <span class="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-amberbrand text-white text-[11px] font-extrabold shadow-xs">${p.discount}</span>

                                <!-- Hover Quick View Button -->
                                <button type="button" data-quickview-id="${p.id}" class="absolute bottom-3 left-3 right-3 py-2 rounded-xl bg-white/95 hover:bg-forest text-forest hover:text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition shadow-md cursor-pointer">
                                    Xem nhanh & Chọn size
                                </button>
                            </div>

                            <!-- Card Body -->
                            <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div>
                                    <!-- Color Swatches -->
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-1.5">
                                            ${p.colors.map((c, idx) => `
                                                <button type="button" data-swatch-product="${p.id}" data-swatch-idx="${idx}" title="${c.name}"
                                                    class="swatch-btn w-4 h-4 rounded-full border transition cursor-pointer ${idx === cIdx ? 'ring-2 ring-forest ring-offset-1 border-forest scale-110' : 'border-gray-300'}"
                                                    style="background-color: ${c.hex};">
                                                </button>
                                            `).join('')}
                                        </div>
                                        <span class="text-[11px] font-medium text-gray-500">★ ${p.rating}</span>
                                    </div>

                                    <!-- Title -->
                                    <h3 class="text-xs sm:text-sm font-semibold text-gray-800 hover:text-forest line-clamp-2 cursor-pointer transition" data-quickview-id="${p.id}">
                                        ${p.name}
                                    </h3>
                                </div>

                                <!-- Price & Quick Add -->
                                <div class="pt-1 border-t border-cream-border/70 flex items-center justify-between gap-2">
                                    <div>
                                        <span class="font-display font-extrabold text-sm sm:text-base text-forest block">${formatVND(p.price)}</span>
                                        <span class="text-[11px] text-gray-400 line-through">${formatVND(p.originalPrice)}</span>
                                    </div>
                                    <button type="button" data-quickadd-id="${p.id}" class="quickadd-btn px-3 py-2 rounded-xl bg-forest-50 hover:bg-forest text-forest hover:text-white text-xs font-bold transition cursor-pointer shrink-0">
                                        + Giỏ
                                    </button>
                                </div>
                            </div>
                        </article>
                    `;
                }).join('');
            }

            // Delegate Clicks on Swatches, QuickView, and QuickAdd across Flash Sale & Catalog
            document.body.addEventListener('click', (e) => {
                // Swatch selection
                const swatchBtn = e.target.closest('.swatch-btn');
                if (swatchBtn) {
                    e.stopPropagation();
                    const pId = Number(swatchBtn.dataset.swatchProduct);
                    const idx = Number(swatchBtn.dataset.swatchIdx);
                    state.activeColorIndex[pId] = idx;
                    renderCatalog();
                    return;
                }

                // Quick add to cart
                const quickAddBtn = e.target.closest('.quickadd-btn');
                if (quickAddBtn) {
                    e.stopPropagation();
                    const pId = Number(quickAddBtn.dataset.quickaddId);
                    const product = PRODUCTS.find(item => item.id === pId);
                    if (product) {
                        const cIdx = state.activeColorIndex[pId] || 0;
                        const color = product.colors[cIdx] || product.colors[0];
                        const defaultSize = product.sizes.includes('M') ? 'M' : product.sizes[0];
                        addToCart(product, color, defaultSize, 1);
                    }
                    return;
                }

                // Open Quick-View Modal
                const qvTrigger = e.target.closest('[data-quickview-id]');
                if (qvTrigger) {
                    const pId = Number(qvTrigger.dataset.quickviewId);
                    openQuickViewModal(pId);
                }
            });

            // --- 5. QUICK-VIEW & SIZE GUIDE MODAL ---
            const qvModal = document.getElementById('quickview-modal');
            const qvBody = document.getElementById('quickview-body');

            function openQuickViewModal(productId) {
                const product = PRODUCTS.find(p => p.id === productId);
                if (!product) return;

                let selectedColorIdx = state.activeColorIndex[product.id] || 0;
                let selectedSize = product.sizes.includes('M') ? 'M' : product.sizes[0];
                let quantity = 1;
                let showSizeChart = false;

                function renderQV() {
                    const activeColor = product.colors[selectedColorIdx];
                    qvBody.innerHTML = `
                        <div class="rounded-2xl overflow-hidden bg-cream border border-cream-border aspect-[4/5]">
                            <img src="${activeColor.img}" alt="${product.name}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src=window.FALLBACK_IMG">
                        </div>
                        <div class="flex flex-col justify-between space-y-4">
                            <div class="space-y-3">
                                <div class="flex items-center gap-2">
                                    <span class="px-2.5 py-0.5 rounded-full bg-forest text-white text-xs font-bold">${product.badge}</span>
                                    <span class="text-xs text-gray-500 font-medium">${product.audience} • ${product.category}</span>
                                </div>
                                <h3 class="font-display font-extrabold text-xl sm:text-2xl text-gray-900 leading-snug">${product.name}</h3>
                                <div class="flex items-baseline gap-2.5">
                                    <span class="font-display font-extrabold text-2xl text-amberbrand">${formatVND(product.price)}</span>
                                    <span class="text-sm text-gray-400 line-through">${formatVND(product.originalPrice)}</span>
                                    <span class="px-2 py-0.5 rounded bg-amberbrand-50 text-amberbrand text-xs font-extrabold">${product.discount}</span>
                                </div>

                                <!-- Fabric Highlight Box -->
                                <div class="p-3 rounded-2xl bg-forest-50 border border-forest/15 text-xs text-forest leading-relaxed">
                                    <strong>🌿 Công nghệ chất liệu:</strong> ${product.fabric}
                                </div>

                                <!-- Color Selector -->
                                <div>
                                    <span class="text-xs font-bold text-gray-700 block mb-2">Màu sắc: <strong class="text-forest">${activeColor.name}</strong></span>
                                    <div class="flex items-center gap-2">
                                        ${product.colors.map((c, idx) => `
                                            <button type="button" data-qv-color="${idx}" class="w-8 h-8 rounded-full border-2 transition cursor-pointer ${idx === selectedColorIdx ? 'border-forest ring-2 ring-forest/30 scale-105' : 'border-gray-300'}" style="background-color: ${c.hex};" title="${c.name}"></button>
                                        `).join('')}
                                    </div>
                                </div>

                                <!-- Size Selector + Size Guide Toggle -->
                                <div>
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-xs font-bold text-gray-700">Kích cỡ: <strong class="text-forest">${selectedSize}</strong></span>
                                        <button type="button" id="qv-toggle-sizechart" class="text-xs font-bold text-amberbrand hover:underline cursor-pointer">
                                            📏 ${showSizeChart ? 'Ẩn bảng size' : 'Hướng dẫn chọn size'}
                                        </button>
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        ${product.sizes.map(sz => `
                                            <button type="button" data-qv-size="${sz}" class="min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${sz === selectedSize ? 'bg-forest text-white border-forest' : 'bg-white text-gray-700 border-cream-border hover:border-forest'}">
                                                ${sz}
                                            </button>
                                        `).join('')}
                                    </div>

                                    <!-- Vietnamese Size Chart Table -->
                                    <div class="${showSizeChart ? 'block' : 'hidden'} mt-3 p-3 rounded-2xl bg-cream border border-cream-border text-[11px]">
                                        <table class="w-full text-left border-collapse">
                                            <thead>
                                                <tr class="border-b border-cream-border text-forest font-bold">
                                                    <th class="py-1">Size</th><th class="py-1">Chiều cao</th><th class="py-1">Cân nặng</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-cream-border/60 text-gray-700">
                                                <tr><td class="py-1 font-bold">S</td><td>1m55 - 1m62</td><td>45 - 53 kg</td></tr>
                                                <tr><td class="py-1 font-bold">M</td><td>1m62 - 1m68</td><td>54 - 62 kg</td></tr>
                                                <tr><td class="py-1 font-bold">L</td><td>1m68 - 1m74</td><td>63 - 70 kg</td></tr>
                                                <tr><td class="py-1 font-bold">XL</td><td>1m74 - 1m80</td><td>71 - 78 kg</td></tr>
                                                <tr><td class="py-1 font-bold">2XL</td><td>1m78 - 1m85</td><td>79 - 86 kg</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <!-- Quantity & Add to Cart -->
                            <div class="pt-3 border-t border-cream-border flex items-center gap-3">
                                <div class="inline-flex items-center border border-cream-border rounded-full bg-cream px-2 py-1">
                                    <button type="button" id="qv-qty-minus" class="w-7 h-7 rounded-full hover:bg-white font-bold text-gray-700 cursor-pointer">-</button>
                                    <span class="w-8 text-center text-sm font-bold">${quantity}</span>
                                    <button type="button" id="qv-qty-plus" class="w-7 h-7 rounded-full hover:bg-white font-bold text-gray-700 cursor-pointer">+</button>
                                </div>
                                <button type="button" id="qv-add-btn" class="flex-1 py-3 px-5 rounded-full bg-forest hover:bg-forest-light text-white font-bold text-sm shadow-md transition cursor-pointer">
                                    Thêm vào giỏ hàng
                                </button>
                            </div>
                        </div>
                    `;

                    // Bind QuickView internal events
                    qvBody.querySelectorAll('[data-qv-color]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            selectedColorIdx = Number(btn.dataset.qvColor);
                            state.activeColorIndex[product.id] = selectedColorIdx;
                            renderQV();
                        });
                    });
                    qvBody.querySelectorAll('[data-qv-size]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            selectedSize = btn.dataset.qvSize;
                            renderQV();
                        });
                    });
                    qvBody.querySelector('#qv-toggle-sizechart').addEventListener('click', () => {
                        showSizeChart = !showSizeChart;
                        renderQV();
                    });
                    qvBody.querySelector('#qv-qty-minus').addEventListener('click', () => {
                        if (quantity > 1) { quantity--; renderQV(); }
                    });
                    qvBody.querySelector('#qv-qty-plus').addEventListener('click', () => {
                        quantity++; renderQV();
                    });
                    qvBody.querySelector('#qv-add-btn').addEventListener('click', () => {
                        addToCart(product, product.colors[selectedColorIdx], selectedSize, quantity);
                        closeQuickViewModal();
                    });
                }

                renderQV();
                qvModal.classList.remove('hidden');
                qvModal.classList.add('flex');
            }

            function closeQuickViewModal() {
                qvModal.classList.add('hidden');
                qvModal.classList.remove('flex');
            }

            document.getElementById('close-quickview-btn').addEventListener('click', closeQuickViewModal);
            qvModal.addEventListener('click', (e) => { if (e.target === qvModal) closeQuickViewModal(); });


            // Authentication and account management use a separate page.
            const profileDropdown = document.getElementById('user-profile-dropdown');
            function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
            function updateAccountUI() {
                document.getElementById('header-account-text').textContent = state.user?.name || 'Đăng nhập';
                document.getElementById('user-online-indicator').classList.toggle('hidden', !state.user);
                if(state.user) {
                    document.getElementById('dropdown-user-name').textContent = state.user.name;
                    document.getElementById('dropdown-user-email').textContent = state.user.email;
                    document.getElementById('dropdown-orders-badge').textContent = state.orders.length;
                }
            }
            document.getElementById('header-account-btn').addEventListener('click',e=>{
                e.stopPropagation();
                if(!state.user) location.href='/account';
                else profileDropdown.classList.toggle('hidden');
            });
            document.querySelectorAll('.portal-open-btn').forEach(btn=>btn.addEventListener('click',()=>location.href='/account?tab='+btn.dataset.portalTab));
            document.getElementById('logout-btn').addEventListener('click',()=>busy(document.getElementById('logout-btn'),async()=>{
                await api('/auth/logout','POST',{});location.reload();
            },e=>showToast(e.message)));
            // --- 7. SHOPPING CART DRAWER & CHECKOUT ---
            const cartDrawer = document.getElementById('cart-drawer');
            const cartBackdrop = document.getElementById('cart-backdrop');
            const checkoutForm = document.getElementById('checkout-form');
            const orderSuccessView = document.getElementById('order-success-view');

            function openCartDrawer() {
                closeMegaMenu();
                renderCart();
                orderSuccessView.classList.add('hidden');
                checkoutForm.classList.add('hidden');
                cartBackdrop.classList.remove('hidden');
                cartDrawer.classList.remove('translate-x-full');
            }

            function closeCartDrawer() {
                cartDrawer.classList.add('translate-x-full');
                cartBackdrop.classList.add('hidden');
            }

            document.getElementById('open-cart-btn').addEventListener('click', openCartDrawer);
            document.getElementById('close-cart-btn').addEventListener('click', closeCartDrawer);
            document.getElementById('continue-shopping-btn').addEventListener('click', closeCartDrawer);
            document.getElementById('new-shopping-btn').addEventListener('click', closeCartDrawer);
            cartBackdrop.addEventListener('click', closeCartDrawer);


            let serverCart;
            const fulfillmentContainer=document.createElement('div');checkoutForm.insertBefore(fulfillmentContainer,document.getElementById('checkout-address'));
            const fulfillmentUI=mountFulfillment(fulfillmentContainer,me.config.fulfillment,document.getElementById('checkout-address'),async choice=>{acceptCart(await api('/cart/fulfillment','POST',choice));},e=>showToast(e.message));
            function acceptCart(c) {
                serverCart=c;
                fulfillmentUI.set(c);
                state.cart=c.items.map(i=>({...i,key:String(i.variant_id),colorName:esc(i.color),size:esc(i.size),name:esc(i.name),img:esc(i.img)}));
                state.promoApplied=c.discount>0;
                renderCart();
            }
            let cartQueue=Promise.resolve();
            function changeCart(transform) {
                cartQueue=cartQueue.then(async()=>{
                    const current=(await api('/cart')).items.map(i=>({variant_id:i.variant_id,qty:i.qty}));
                    acceptCart(await api('/cart','PUT',{items:transform(current)}));
                }).catch(async e=>{showToast(e.message);try{acceptCart(await api('/cart'));}catch{}});
                return cartQueue;
            }
            async function addToCart(product,colorObj,size,qty=1) {
                if(state.user&&state.user.role!=='customer')return showToast('Tài khoản quản lý không đặt mua hàng.');
                const variant=product.variants.find(v=>v.active&&v.color===colorObj.name&&v.size===size);
                if(!variant) return showToast('Biến thể này chưa có hàng.');
                await changeCart(items=>{
                    const old=items.find(i=>i.variant_id===variant.id);
                    if(old) old.qty+=qty;else items.push({variant_id:variant.id,qty});
                    return items;
                });
            }
            function renderCart() {
                const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
                document.getElementById('header-cart-count').textContent = totalItems;
                document.getElementById('drawer-cart-count').textContent = totalItems;

                const itemsContainer = document.getElementById('cart-items-container');
                const emptyView = document.getElementById('empty-cart-view');
                const footerSummary = document.getElementById('cart-footer-summary');

                if (state.cart.length === 0) {
                    itemsContainer.innerHTML = '';
                    emptyView.classList.remove('hidden');
                    footerSummary.classList.add('hidden');
                    checkoutForm.classList.add('hidden');
                    updateShippingProgress(0);
                    return;
                }

                emptyView.classList.add('hidden');
                footerSummary.classList.remove('hidden');

                itemsContainer.innerHTML = state.cart.map(item => `
                    <div class="flex gap-3 p-3 rounded-2xl bg-cream/70 border border-cream-border">
                        <img src="${item.img}" alt="${item.name}" class="w-16 h-20 rounded-xl object-cover bg-white shrink-0" onerror="this.onerror=null;this.src=window.FALLBACK_IMG">
                        <div class="flex-1 min-w-0 flex flex-col justify-between">
                            <div class="flex items-start justify-between gap-2">
                                <h5 class="text-xs font-bold text-gray-800 line-clamp-2">${item.name}</h5>
                                <button type="button" data-cart-remove="${item.key}" class="text-gray-400 hover:text-red-500 text-xs shrink-0 cursor-pointer" title="Xóa">✕</button>
                            </div>
                            <p class="text-[11px] text-gray-500">Màu: ${item.colorName} • Size: <strong>${item.size}</strong></p>
                            <div class="flex items-center justify-between mt-1.5">
                                <span class="font-display font-extrabold text-xs sm:text-sm text-forest">${formatVND(item.price * item.qty)}</span>
                                <div class="inline-flex items-center border border-cream-border rounded-full bg-white px-1.5 py-0.5">
                                    <button type="button" data-cart-dec="${item.key}" class="w-5 h-5 text-xs font-bold text-gray-700 cursor-pointer">-</button>
                                    <span class="w-6 text-center text-xs font-bold">${item.qty}</span>
                                    <button type="button" data-cart-inc="${item.key}" class="w-5 h-5 text-xs font-bold text-gray-700 cursor-pointer">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');

                // Totals Calculation
                const {subtotal,shipping,discount,total}=serverCart;

                updateShippingProgress(subtotal);
                document.getElementById('cart-subtotal').textContent = formatVND(subtotal);
                document.getElementById('cart-shipping').textContent = serverCart.shippingPending?'Chọn nơi nhận hàng':shipping === 0 ? 'Miễn phí' : formatVND(shipping);

                const discountRow = document.getElementById('cart-discount-row');
                if (state.promoApplied) {
                    discountRow.classList.remove('hidden');
                    discountRow.classList.add('flex');
                } else {
                    discountRow.classList.add('hidden');
                    discountRow.classList.remove('flex');
                }
                document.getElementById('cart-total').textContent = formatVND(total);
            }

            function updateShippingProgress(subtotal) {
                const textEl = document.getElementById('shipping-progress-text');
                const barEl = document.getElementById('shipping-progress-bar');
                barEl.style.width=serverCart&&!serverCart.shippingPending&&serverCart.shipping===0?'100%':'0%';
                textEl.textContent='Nhận tại cửa hàng hoặc giao trong TP.HCM miễn phí. Ngoài tỉnh 30.000đ/đơn.';
            }


            document.getElementById('cart-items-container').addEventListener('click',e=>{
                const btn=e.target.closest('button');if(!btn)return;
                const key=btn.dataset.cartInc||btn.dataset.cartDec||btn.dataset.cartRemove;if(!key)return;
                changeCart(items=>items.map(i=>i.variant_id===Number(key)?{...i,qty:btn.dataset.cartRemove?0:i.qty+(btn.dataset.cartInc?1:-1)}:i).filter(i=>i.qty>0));
            });
            document.getElementById('apply-promo-btn').addEventListener('click',()=>busy(document.getElementById('apply-promo-btn'),async()=>{
                acceptCart(await api('/cart/promo','POST',{code:document.getElementById('promo-code-input').value}));
                const el=document.getElementById('promo-feedback');el.classList.remove('hidden');el.textContent='Đã cập nhật ưu đãi (đơn tối thiểu 99.000đ).';
            },e=>showToast(e.message)));
            document.getElementById('proceed-checkout-btn').addEventListener('click',()=>busy(document.getElementById('proceed-checkout-btn'),async()=>{
                state.user=(await api('/me')).user;
                if(!state.user) {location.href='/account?checkout=1';return;}
                if(state.user.role!=='customer'){location.href='/admin';return;}
                checkoutForm.classList.remove('hidden');
                document.getElementById('checkout-name').value=state.user.name;
                document.getElementById('checkout-phone').value=state.user.phone||'';
                document.getElementById('checkout-address').value=state.user.address||'';
                checkoutForm.scrollIntoView({behavior:'smooth'});
            },e=>showToast(e.message)));
            let checkoutKey=sessionStorage.getItem('mv-checkout-key')||crypto.randomUUID();
            checkoutForm.addEventListener('submit',e=>{
                e.preventDefault();busy(checkoutForm.querySelector('[type=submit]'),async()=>{
                    await cartQueue;
                    await fulfillmentUI.wait();
                    sessionStorage.setItem('mv-checkout-key',checkoutKey);
                    const o=await api('/orders','POST',{requestKey:checkoutKey,quote:serverCart.quote,...fulfillmentUI.read(),receiver:document.getElementById('checkout-name').value,phone:document.getElementById('checkout-phone').value,address:document.getElementById('checkout-address').value,method:'cod'});
                    sessionStorage.removeItem('mv-checkout-key');checkoutKey=crypto.randomUUID();
                    acceptCart(await api('/cart'));state.orders=await api('/orders');updateAccountUI();
                    document.getElementById('empty-cart-view').classList.add('hidden');
                    checkoutForm.classList.add('hidden');
                    document.getElementById('order-success-code').textContent='Mã đơn hàng: #'+o.id+' · Thanh toán khi nhận hàng (COD)';
                    orderSuccessView.classList.remove('hidden');showToast('Đơn hàng đã được lưu.');
                },async e=>{if(await redirectForLogin(e,'/account?checkout=1'))return;showToast(e.message);try{acceptCart(await api('/cart'));}catch{}});
            });
            document.getElementById('newsletter-form').addEventListener('submit',e=>{
                e.preventDefault();busy(e.target.querySelector('button'),async()=>{
                    await api('/newsletter','POST',{email:document.getElementById('newsletter-email').value});
                    e.target.reset();showToast('Đã đăng ký nhận ưu đãi.');
                },e=>showToast(e.message));
            });
            // Global ESC & Outside Click Cleanup
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeMegaMenu();
                    closeQuickViewModal();
                    closeAuthModal();
                    closeCartDrawer();
                    profileDropdown.classList.add('hidden');
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#header-account-btn') && !e.target.closest('#user-profile-dropdown')) {
                    profileDropdown.classList.add('hidden');
                }
            });

            // Initial Render
            acceptCart(await api('/cart'));
            if(state.user) state.orders=await api('/orders');
            updateAccountUI();renderFlashSale();renderCatalog();
            if(new URLSearchParams(location.search).has('checkout')&&state.user) {openCartDrawer();document.getElementById('proceed-checkout-btn').click();}
            } catch(e) { alert('Không tải được cửa hàng: '+e.message); }
        });
    
