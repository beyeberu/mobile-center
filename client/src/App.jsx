import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, Battery, Camera, Check,
  ChevronDown, Clock3, Droplets, Headphones, Menu, MessageCircle, Search, Send,
  ShieldCheck, Smartphone, Star, Wrench, X, Zap,
} from 'lucide-react';
import Admin from './Admin.jsx';
import ProductCard from './ProductCard.jsx';
import { api, money, whatsappLink } from './api.js';
import { storeConfig } from './storeConfig.js';
import heroBanner from './image/Screenshot 2026-10-02 143218.png';

const serviceIcons = [Smartphone, Battery, Zap, ArrowUpRight, Headphones, Wrench, ShieldCheck, MessageCircle];
const serviceIconMap = { screen: Smartphone, battery: Battery, charging: Zap, camera: Camera, audio: Headphones, software: Wrench, water: Droplets, other: MessageCircle, wrench: Wrench };
const reviews = [
  { name: 'Alex M.', note: 'Verified customer', quote: 'The team helped me compare a few models without any pressure. Love my new phone.', stars: 5 },
  { name: 'Jamie R.', note: 'Screen repair', quote: 'My screen looks brand new. Fast turnaround and they kept me updated the whole time.', stars: 5 },
  { name: 'Taylor S.', note: 'Verified customer', quote: 'Great price, lovely service, and the phone was ready when they said it would be.', stars: 5 },
];

function Overlay({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('modal-open');
    return () => { window.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('modal-open'); };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-heading"><div><span className="eyebrow">{storeConfig.shopName.toUpperCase()}</span><h2>{title}</h2></div><button className="close-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        {children}
      </section>
    </div>
  );
}

function ProductDetails({ product, onOrder, onClose }) {
  const [imageIndex, setImageIndex] = useState(0);
  return (
    <Overlay title="Phone details" onClose={onClose} wide>
      <div className="detail-layout">
        <div className="detail-gallery">
          <div className="detail-image">{product.images?.[imageIndex] && <img src={product.images[imageIndex]} alt={`${product.model} view ${imageIndex + 1}`} />}</div>
          <div className="detail-thumbs">{(product.images || []).map((image, index) => <button key={image} className={index === imageIndex ? 'active' : ''} onClick={() => setImageIndex(index)}><img src={image} alt={`View ${index + 1}`} /></button>)}</div>
        </div>
        <div className="detail-copy">
          <span className="detail-brand">{product.brand} / {product.storage}</span>
          <h3>{product.model}</h3>
          <div className="detail-price">{money(product.salePrice || product.price)} {product.salePrice && <del>{money(product.price)}</del>}</div>
          <p>{product.description}</p>
          <dl className="spec-list"><div><dt>Storage</dt><dd>{product.storage}</dd></div><div><dt>Memory</dt><dd>{product.ram} RAM</dd></div><div><dt>Color</dt><dd>{product.color}</dd></div><div><dt>Availability</dt><dd>{product.stock ? `${product.stock} available` : 'Out of stock'}</dd></div></dl>
          <button className="button button-primary button-full" onClick={() => onOrder(product)} disabled={!product.stock}>Order now <ArrowRight size={17} /></button>
          <a className="text-link whatsapp-detail" href={whatsappLink(`Hi, I'm interested in the ${product.brand} ${product.model}.`)} target={storeConfig.whatsappNumber ? '_blank' : undefined} rel={storeConfig.whatsappNumber ? 'noreferrer' : undefined}><MessageCircle size={16} /> {storeConfig.whatsappNumber ? 'Ask us on WhatsApp' : 'Contact the shop'}</a>
        </div>
      </div>
    </Overlay>
  );
}

function OrderDialog({ product, onClose, onComplete }) {
  const [form, setForm] = useState({ name: '', phone: '', quantity: 1, color: product.color, fulfillment: 'Pickup' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api('/api/orders', { method: 'POST', body: JSON.stringify({ ...form, productId: product.id }) });
      onComplete(result.message);
    } catch (submitError) { setError(submitError.message); } finally { setBusy(false); }
  };
  return (
    <Overlay title="Place your order" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <div className="order-summary"><span>{product.brand} · {product.model}</span><strong>{money(product.salePrice || product.price)}</strong></div>
        <label>Your name<input required maxLength="100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>
        <label>Phone number<input required type="tel" minLength="7" maxLength="32" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" placeholder="For order confirmation" /></label>
        <div className="form-row"><label>Quantity<select value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}>{Array.from({ length: Math.min(product.stock, 10) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><label>Color<input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label></div>
        <fieldset className="choice-field"><legend>Fulfillment</legend><label><input type="radio" name="fulfillment" checked={form.fulfillment === 'Pickup'} onChange={() => setForm({ ...form, fulfillment: 'Pickup' })} /> Store pickup</label><label><input type="radio" name="fulfillment" checked={form.fulfillment === 'Delivery'} onChange={() => setForm({ ...form, fulfillment: 'Delivery' })} /> Delivery</label></fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-full" disabled={busy}>{busy ? 'Placing order…' : 'Confirm order'} <ArrowRight size={17} /></button>
        <p className="form-footnote">No account needed. We’ll call to confirm your order.</p>
      </form>
    </Overlay>
  );
}

function RepairDialog({ services, onClose, onComplete }) {
  const [form, setForm] = useState({ name: '', phone: '', serviceId: services[0]?.id || '', device: '', details: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api('/api/repairs', { method: 'POST', body: JSON.stringify(form) });
      onComplete(result.message);
    } catch (submitError) { setError(submitError.message); } finally { setBusy(false); }
  };
  return (
    <Overlay title="Book a repair" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <p className="dialog-intro">Tell us what needs fixing. Our team will call to confirm a time and quote.</p>
        <label>Your name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>
        <label>Phone number<input required type="tel" minLength="7" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" /></label>
        <label>Repair service<select required value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label>Phone model<input required value={form.device} onChange={(event) => setForm({ ...form, device: event.target.value })} placeholder="e.g. iPhone 14 Pro" /></label>
        <label>What happened? <span className="optional-label">Optional</span><textarea rows="3" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-full" disabled={busy}>{busy ? 'Sending request…' : 'Request a repair'} <ArrowRight size={17} /></button>
      </form>
    </Overlay>
  );
}

function Notice({ message, onClose }) {
  useEffect(() => { const timer = setTimeout(onClose, 5000); return () => clearTimeout(timer); }, [onClose]);
  return <div className="notice" role="status"><Check size={18} />{message}<button onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>;
}

function Storefront() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);
  const [orderProduct, setOrderProduct] = useState(null);
  const [repairOpen, setRepairOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [saleOnly, setSaleOnly] = useState(false);
  const [filters, setFilters] = useState({ brand: 'All brands', storage: 'Any storage', availability: 'Any availability', sort: 'featured', maxPrice: '' });

  const loadStore = async () => {
    try {
      const [phoneData, serviceData] = await Promise.all([api('/api/products'), api('/api/services')]);
      setProducts(phoneData); setServices(serviceData); setLoadError('');
    } catch (error) { setLoadError(error.message); }
  };
  useEffect(() => {
    loadStore();
    const refresh = window.setInterval(loadStore, 30000);
    return () => window.clearInterval(refresh);
  }, []);

  useEffect(() => {
    const revealItems = document.querySelectorAll('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

    revealItems.forEach((item) => {
      item.classList.add('reveal-ready');
      observer.observe(item);
    });
    return () => observer.disconnect();
  }, []);

  const brands = useMemo(() => ['All brands', ...new Set(products.map((item) => item.brand))], [products]);
  const filteredProducts = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesSearch = !term || `${product.brand} ${product.model} ${product.storage}`.toLowerCase().includes(term);
      const matchesBrand = filters.brand === 'All brands' || product.brand === filters.brand;
      const matchesStorage = filters.storage === 'Any storage' || product.storage === filters.storage;
      const matchesStock = filters.availability === 'Any availability' || (filters.availability === 'In stock' ? product.stock > 0 : product.stock === 0);
      const matchesPrice = !filters.maxPrice || (product.salePrice || product.price) <= Number(filters.maxPrice);
      return matchesSearch && matchesBrand && matchesStorage && matchesStock && matchesPrice && (!saleOnly || Boolean(product.salePrice));
    });
    if (filters.sort === 'price-low') filtered.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    if (filters.sort === 'price-high') filtered.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    if (filters.sort === 'newest') filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filters.sort === 'featured') filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
    return filtered;
  }, [products, deferredQuery, filters, saleOnly]);

  const showNotice = (message) => { setNotice(message); setActiveProduct(null); setOrderProduct(null); setRepairOpen(false); loadStore(); };
  const closeMobileMenu = () => setMobileMenuOpen(false);
  if (window.location.pathname.startsWith('/admin')) return <Admin />;

  return (
    <div className="storefront">
      <div className="announcement"><span>TRADE IN, TRADE UP</span><span>Get a better deal on your next phone <ArrowRight size={13} /></span></div>
      <header className="site-header">
        <a className="brand-lockup" href="#home" aria-label={`${storeConfig.shopName} home`}><span className="brand-symbol"><Smartphone size={20} /></span><span>{storeConfig.shopName.toUpperCase()}</span></a>
        <nav className={`main-nav ${mobileMenuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {[['Home', '#home'], ['Phones', '#phones'], ['Repairs', '#repairs'], ['Offers', '#offers'], ['About', '#about'], ['Contact', '#contact']].map(([label, href]) => <a key={label} href={href} onClick={closeMobileMenu}>{label}</a>)}
        </nav>
        <div className="header-actions"><a href={whatsappLink()} className="header-contact"><MessageCircle size={16} /> <span>Let’s talk</span></a><button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}>{mobileMenuOpen ? <X /> : <Menu />}</button></div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> GOOD TECH. GOOD PEOPLE.</p><h1>Find your<br /><span className="hero-second-line">next <span>favorite.</span></span></h1><p className="hero-subtitle">New phone, fixed phone, peace of mind. Your neighborhood experts make it easy to get more from your tech.</p><div className="hero-actions"><a href="#phones" className="button button-dark">Shop phones <ArrowUpRight size={17} /></a><button className="button button-outline" onClick={() => setRepairOpen(true)}>Book a repair <Wrench size={16} /></button></div><div className="hero-proof"><div className="avatar-stack"><span>A</span><span>J</span><span>M</span></div><div><div className="rating-stars">★★★★★</div><small>Here for you, every step</small></div></div></div>
          <div className="hero-art"><div className="hero-photo"><img src={heroBanner} alt="Beyushop mobile phones, accessories, earbuds, and repair services in Gondar" fetchPriority="high" /></div></div>
          <a className="scroll-cue" href="#phones"><span>SCROLL TO EXPLORE</span><ArrowDown size={14} /></a>
        </section>

        <section className="trust-strip" aria-label="Our promises"><div><ShieldCheck size={19} /><span>Quality checked</span></div><div><Zap size={18} /><span>Fast repairs</span></div><div><MessageCircle size={18} /><span>Real human help</span></div><div><Star size={18} /><span>Local & trusted</span></div></section>

        <section className="section section-products" id="phones" data-reveal>
          <div className="section-heading"><div><p className="eyebrow">THE GOOD STUFF</p><h2>Find your <span>phone.</span></h2></div><a className="text-link desktop-link" href="#contact">Need a recommendation? <ArrowUpRight size={16} /></a></div>
          <div className="shop-tools"><label className="search-box"><Search size={18} /><input aria-label="Search phones" placeholder="Search phones, brands, storage…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label><div className="filter-tools">
            <label className="filter-select"><span className="sr-only">Brand</span><select value={filters.brand} onChange={(event) => setFilters({ ...filters, brand: event.target.value })}>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select><ChevronDown size={14} /></label>
            <label className="filter-select"><span className="sr-only">Storage</span><select value={filters.storage} onChange={(event) => setFilters({ ...filters, storage: event.target.value })}><option>Any storage</option>{[...new Set(products.map((product) => product.storage))].map((storage) => <option key={storage}>{storage}</option>)}</select><ChevronDown size={14} /></label>
            <label className="filter-select"><span className="sr-only">Availability</span><select value={filters.availability} onChange={(event) => setFilters({ ...filters, availability: event.target.value })}><option>Any availability</option><option>In stock</option><option>Out of stock</option></select><ChevronDown size={14} /></label>
            <label className="max-price"><span>{storeConfig.currencySymbol}</span><input type="number" min="0" placeholder="Max price" aria-label="Maximum price" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} /></label>
            <label className="filter-select sort-select"><span className="sort-icon"><ArrowDown size={14} /></span><select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={14} /></label>
            <label className={`sale-filter ${saleOnly ? 'sale-filter-active' : ''}`}><input type="checkbox" checked={saleOnly} onChange={(event) => setSaleOnly(event.target.checked)} /> On sale</label>
          </div></div>
          <div className="catalog-count"><span>{filteredProducts.length} phones to love</span><span>All devices tested & ready</span></div>
          {loadError && <div className="inline-error"><p>{loadError}</p><button className="text-link" onClick={loadStore}>Try again <ArrowRight size={15} /></button></div>}
          <div className="product-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onDetails={setActiveProduct} onOrder={setOrderProduct} />)}</div>
          {!filteredProducts.length && !loadError && <div className="empty-results"><Smartphone size={28} /><p>No phones match those filters.</p><button className="text-link" onClick={() => { setQuery(''); setFilters({ brand: 'All brands', storage: 'Any storage', availability: 'Any availability', sort: 'featured', maxPrice: '' }); }}>Clear filters</button></div>}
          <div className="center-action"><a className="button button-outline" href="#phones" onClick={() => document.querySelector('.shop-tools')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Explore the collection <ArrowDown size={15} /></a></div>
        </section>

        <section className="offer-band" id="offers" data-reveal><div className="offer-text"><p className="eyebrow">A LITTLE SOMETHING EXTRA</p><h2>Good phones.<br /><span>Even better deals.</span></h2><p>Selected favorites, special prices. Find your next upgrade for a little less.</p><a className="button button-light" href="#phones" onClick={() => setSaleOnly(true)}>Shop the offers <ArrowUpRight size={16} /></a></div><div className="offer-visual"><img src="https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=85" alt="A modern smartphone available at a special price" loading="lazy" /><span className="offer-seal">NICE<br />PRICE<br /><ArrowDownRight size={18} /></span></div></section>

        <section className="section section-repairs" id="repairs" data-reveal><div className="section-heading"><div><p className="eyebrow">WE CAN FIX THAT</p><h2>Little fix.<br /><span>Big relief.</span></h2></div><button className="button button-dark" onClick={() => setRepairOpen(true)}>Book your repair <ArrowUpRight size={17} /></button></div><p className="section-lede">Thoughtful repairs from people who know their stuff. Quality parts, clear quotes, no fuss.</p><div className="service-grid">{services.map((service, index) => { const Icon = serviceIconMap[service.icon] || serviceIcons[index % serviceIcons.length]; return <button className="service-tile" key={service.id} onClick={() => setRepairOpen(true)}><span className="service-icon"><Icon size={20} /></span><span className="service-title">{service.name}</span><span className="service-description">{service.description}</span><span className="service-price">{service.price ? `From ${money(service.price)}` : 'Ask for a quote'} <ArrowUpRight size={14} /></span></button>; })}</div></section>

        <section className="why-section" id="about" data-reveal><div className="why-image"><img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85" alt="Our team helping customers with technology" loading="lazy" /><span className="image-caption">GOOD TECH IS BETTER TOGETHER.</span></div><div className="why-copy"><p className="eyebrow">NOT JUST A PHONE SHOP</p><h2>People first.<br /><span>Tech second.</span></h2><p>We believe buying or fixing a phone should feel simple. Our friendly team gives honest advice, careful repairs, and support that doesn't disappear after checkout.</p><div className="why-points"><div><Check size={16} /><span>Honest, helpful advice</span></div><div><Check size={16} /><span>Carefully checked devices</span></div><div><Check size={16} /><span>Repairs with care</span></div></div><a className="text-link" href="#contact">Come say hello <ArrowRight size={16} /></a></div></section>

        <section className="section reviews-section" data-reveal><div className="section-heading"><div><p className="eyebrow">KIND WORDS, REAL PEOPLE</p><h2>Don't just take <span>our word.</span></h2></div><div className="review-rating"><span>4.9</span><div><div className="rating-stars">★★★★★</div><small>Customer-loved service</small></div></div></div><div className="review-grid">{reviews.map((review) => <article className="review-card" key={review.name}><div className="rating-stars">{'★'.repeat(review.stars)}</div><p>“{review.quote}”</p><div className="review-person"><span className="review-avatar">{review.name[0]}</span><span><strong>{review.name}</strong><small>{review.note}</small></span><Check size={15} /></div></article>)}</div></section>

        <section className="contact-section" id="contact" data-reveal><div className="contact-main"><p className="eyebrow">WE'RE RIGHT HERE</p><h2>Good chat.<br /><span>Good tech.</span></h2><p>Questions, a repair, or just want a second opinion? Our friendly team is one message away.</p><a className="button button-dark" href={whatsappLink()} target={storeConfig.whatsappNumber ? '_blank' : undefined} rel={storeConfig.whatsappNumber ? 'noreferrer' : undefined}><MessageCircle size={17} /> {storeConfig.whatsappNumber ? 'Chat on WhatsApp' : 'Contact our team'}</a></div><div className="contact-details"><div><span className="contact-label">COME FIND US</span><strong>{storeConfig.address}</strong><span>{storeConfig.locality}</span>{storeConfig.address.startsWith('Add ') ? <a href="#contact">Directions available soon <ArrowUpRight size={14} /></a> : <a href={`https://maps.google.com/?q=${encodeURIComponent(`${storeConfig.address}, ${storeConfig.locality}`)}`} target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={14} /></a>}</div><div><span className="contact-label">SAY HELLO</span>{storeConfig.phoneLink ? <a className="contact-phone" href={`tel:${storeConfig.phoneLink}`}>{storeConfig.phoneDisplay}</a> : <strong>{storeConfig.phoneDisplay}</strong>}<span>{storeConfig.hours}</span><a className="email-contact" href={`mailto:${storeConfig.email}`}>{storeConfig.email} <ArrowUpRight size={14} /></a><a href={whatsappLink()} target={storeConfig.whatsappNumber ? '_blank' : undefined} rel={storeConfig.whatsappNumber ? 'noreferrer' : undefined}>{storeConfig.whatsappNumber ? 'Message us on WhatsApp' : 'Contact details'} <ArrowUpRight size={14} /></a><a className="telegram-contact" href={`https://t.me/${storeConfig.telegramUsername}`} target="_blank" rel="noreferrer"><Send size={14} /> Telegram @{storeConfig.telegramUsername}</a></div></div></section>
      </main>

      <footer className="site-footer"><a className="brand-lockup" href="#home"><span className="brand-symbol"><Smartphone size={19} /></span><span>{storeConfig.shopName.toUpperCase()}</span></a><span>Good tech. Good people. © {new Date().getFullYear()}</span><div><a href="#phones">Shop</a><a href="#repairs">Repairs</a><a href="/admin">Team login <ArrowUpRight size={12} /></a></div></footer>
      <a className="floating-whatsapp" href={whatsappLink()} target={storeConfig.whatsappNumber ? '_blank' : undefined} rel={storeConfig.whatsappNumber ? 'noreferrer' : undefined} aria-label={storeConfig.whatsappNumber ? `Chat with ${storeConfig.shopName} on WhatsApp` : `Contact ${storeConfig.shopName}`}><MessageCircle size={23} /></a>
      {activeProduct && <ProductDetails product={activeProduct} onOrder={(product) => { setActiveProduct(null); setOrderProduct(product); }} onClose={() => setActiveProduct(null)} />}
      {orderProduct && <OrderDialog product={orderProduct} onClose={() => setOrderProduct(null)} onComplete={showNotice} />}
      {repairOpen && <RepairDialog services={services} onClose={() => setRepairOpen(false)} onComplete={showNotice} />}
      {notice && <Notice message={notice} onClose={() => setNotice('')} />}
    </div>
  );
}

export default function App() {
  return <Storefront />;
}