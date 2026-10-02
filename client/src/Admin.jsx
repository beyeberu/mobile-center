import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, Battery, Boxes, Camera, Check, ChevronDown,
  CircleDollarSign, Clock3, Droplets, Headphones, ImagePlus, LayoutDashboard,
  LogOut, Menu, MessageCircle, PackageCheck, Pencil, Plus, Search, Smartphone,
  Trash2, Wrench, X, Zap,
} from 'lucide-react';
import { api, money } from './api.js';
import { storeConfig } from './storeConfig.js';

const orderStatuses = ['New', 'Confirmed', 'Processing', 'Ready', 'Completed', 'Cancelled'];
const emptyPhone = { brand: '', model: '', storage: '', ram: '', color: '', price: '', salePrice: '', stock: 0, description: '', images: [], featured: false, isNew: false };
const emptyService = { name: '', description: '', price: '', icon: 'wrench', enabled: true };
const adminServiceIcons = { screen: Smartphone, battery: Battery, charging: Zap, camera: Camera, audio: Headphones, software: Wrench, water: Droplets, other: MessageCircle, wrench: Wrench };

function AdminFrame({ tab, setTab, username, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Phones', icon: Smartphone },
    { id: 'services', label: 'Repair services', icon: Wrench },
    { id: 'orders', label: 'Orders & requests', icon: PackageCheck },
  ];
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <a href="/" className="admin-brand"><span className="brand-symbol"><Smartphone size={19} /></span><span>{storeConfig.shopName.toUpperCase()}</span></a>
        <span className="sidebar-label">WORKSPACE</span>
        <nav aria-label="Admin navigation">{items.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => { setTab(id); setSidebarOpen(false); }}><Icon size={18} />{label}{id === 'orders' && <span className="nav-indicator" />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="admin-user"><span className="user-avatar">{username[0]?.toUpperCase()}</span><span><strong>{username}</strong><small>Store administrator</small></span></div><button className="sidebar-logout" onClick={onLogout}><LogOut size={17} /><span>Sign out</span></button><a className="back-to-store" href="/"><ArrowLeft size={15} /> Back to store</a></div>
      </aside>
      <div className="admin-content-wrap"><header className="admin-topbar"><button className="admin-menu-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation"><Menu size={20} /></button><span>STORE ADMINISTRATION</span><a href="/" target="_blank" rel="noreferrer">View storefront <ArrowUpRight size={14} /></a></header><main className="admin-content">{children}</main></div>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }); onLogin(); }
    catch (loginError) { setError(loginError.message); } finally { setBusy(false); }
  };
  return (
    <main className="admin-login-page"><a className="admin-brand login-brand" href="/"><span className="brand-symbol"><Smartphone size={19} /></span><span>{storeConfig.shopName.toUpperCase()}</span></a><section className="login-panel"><div className="login-icon"><LayoutDashboard size={22} /></div><p className="eyebrow">TEAM ACCESS</p><h1>Welcome back, {storeConfig.ownerName}.</h1><p>Sign in to manage your store, inventory, and customer requests.</p><form onSubmit={submit}><label>Username<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark button-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowUpRight size={16} /></button></form><a className="login-home" href="/">← Return to store</a></section><span className="login-footer">{storeConfig.shopName.toUpperCase()} · PRIVATE ADMIN</span></main>
  );
}

function Field({ label, children, className = '' }) {
  return <label className={`admin-field ${className}`}>{label}{children}</label>;
}

function ProductEditor({ product, onClose, onSave }) {
  const [form, setForm] = useState(product ? { ...product, salePrice: product.salePrice ?? '' } : { ...emptyPhone });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const uploadImages = async (event) => {
    if (!event.target.files?.length) return;
    setUploadBusy(true); setError('');
    try {
      const body = new FormData();
      [...event.target.files].forEach((file) => body.append('images', file));
      const images = await api('/api/admin/uploads', { method: 'POST', body });
      change('images', [...form.images, ...images].slice(0, 8));
    } catch (uploadError) { setError(uploadError.message); }
    finally { setUploadBusy(false); event.target.value = ''; }
  };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave({ ...form, price: Number(form.price), salePrice: form.salePrice === '' ? null : Number(form.salePrice), stock: Number(form.stock) }); }
    catch (saveError) { setError(saveError.message); } finally { setBusy(false); }
  };
  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="admin-modal product-editor" role="dialog" aria-modal="true" aria-label={product ? 'Edit phone' : 'Add phone'}><div className="admin-modal-head"><div><span className="eyebrow">INVENTORY</span><h2>{product ? 'Edit phone' : 'Add a phone'}</h2></div><button className="close-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form onSubmit={submit}>
      <div className="editor-fields"><Field label="Brand"><input required value={form.brand} onChange={(event) => change('brand', event.target.value)} /></Field><Field label="Model name"><input required value={form.model} onChange={(event) => change('model', event.target.value)} /></Field><Field label="Storage"><input required placeholder="256GB" value={form.storage} onChange={(event) => change('storage', event.target.value)} /></Field><Field label="RAM"><input required placeholder="8GB" value={form.ram} onChange={(event) => change('ram', event.target.value)} /></Field><Field label="Color"><input required value={form.color} onChange={(event) => change('color', event.target.value)} /></Field><Field label="Stock quantity"><input required type="number" min="0" step="1" value={form.stock} onChange={(event) => change('stock', event.target.value)} /></Field><Field label="Price ($)"><input required type="number" min="0" step="1" value={form.price} onChange={(event) => change('price', event.target.value)} /></Field><Field label="Sale price ($)"><input type="number" min="0" step="1" value={form.salePrice} onChange={(event) => change('salePrice', event.target.value)} placeholder="Optional" /></Field><Field label="Description" className="editor-span"><textarea required rows="3" value={form.description} onChange={(event) => change('description', event.target.value)} /></Field></div>
      <div className="upload-section"><div className="upload-label"><span>Product photos</span><small>Up to 8 images · JPG, PNG, WebP · 8MB each</small></div><label className="upload-button"><ImagePlus size={17} />{uploadBusy ? 'Uploading…' : 'Upload images'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={uploadImages} disabled={uploadBusy || form.images.length >= 8} /></label>{form.images.length > 0 && <div className="image-manager">{form.images.map((image, index) => <div className="managed-image" key={`${image}-${index}`}><img src={image} alt={`Product image ${index + 1}`} /><button type="button" aria-label="Remove image" onClick={() => change('images', form.images.filter((_, current) => current !== index))}><X size={14} /></button></div>)}</div>}</div>
      <div className="editor-checks"><label><input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => change('featured', event.target.checked)} /> Featured on home</label><label><input type="checkbox" checked={Boolean(form.isNew)} onChange={(event) => change('isNew', event.target.checked)} /> Mark as new</label></div>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="admin-modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={busy || uploadBusy}>{busy ? 'Saving…' : product ? 'Save changes' : 'Add phone'} <Check size={16} /></button></div>
    </form></section></div>
  );
}

function ServiceEditor({ service, onClose, onSave }) {
  const [form, setForm] = useState(service ? { ...service, price: service.price ?? '' } : { ...emptyService });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave({ ...form, price: form.price === '' ? null : Number(form.price) }); }
    catch (saveError) { setError(saveError.message); } finally { setBusy(false); }
  };
  return <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="admin-modal service-editor" role="dialog" aria-modal="true" aria-label="Repair service"><div className="admin-modal-head"><div><span className="eyebrow">REPAIRS</span><h2>{service ? 'Edit service' : 'Add a service'}</h2></div><button className="close-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form onSubmit={submit}><Field label="Service name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Description"><textarea required rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label="Price ($) · leave blank for quote"><input type="number" min="0" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field><Field label="Service icon"><select value={form.icon || 'wrench'} onChange={(event) => setForm({ ...form, icon: event.target.value })}><option value="screen">Screen</option><option value="battery">Battery</option><option value="charging">Charging</option><option value="camera">Camera</option><option value="audio">Speaker & microphone</option><option value="software">Software</option><option value="water">Water damage</option><option value="other">Other</option></select></Field><label className="editor-toggle"><input type="checkbox" checked={Boolean(form.enabled)} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Visible on website</label>{error && <p className="form-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Save service'} <Check size={16} /></button></div></form></section></div>;
}

function EmptyState({ icon: Icon = Boxes, title, detail }) {
  return <div className="admin-empty"><span><Icon size={22} /></span><strong>{title}</strong><p>{detail}</p></div>;
}

export default function Admin() {
  const [username, setUsername] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [tab, setTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editorProduct, setEditorProduct] = useState(undefined);
  const [editorService, setEditorService] = useState(undefined);
  const [productQuery, setProductQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('All requests');
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    if (!username) return;
    setLoading(true); setError('');
    try {
      const [productData, serviceData, orderData] = await Promise.all([
        api('/api/admin/products'), api('/api/admin/services'), api('/api/admin/orders'),
      ]);
      setProducts(productData); setServices(serviceData); setOrders(orderData);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [username]);

  useEffect(() => {
    api('/api/admin/session').then((session) => setUsername(session.username)).catch(() => setUsername('')).finally(() => setCheckingSession(false));
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const saveProduct = async (product) => {
    await api(editorProduct?.id ? `/api/admin/products/${editorProduct.id}` : '/api/admin/products', {
      method: editorProduct?.id ? 'PUT' : 'POST', body: JSON.stringify(product),
    });
    setEditorProduct(undefined); setToast('Phone saved'); await loadData();
  };
  const removeProduct = async (product) => {
    if (!window.confirm(`Delete ${product.brand} ${product.model}?`)) return;
    try { await api(`/api/admin/products/${product.id}`, { method: 'DELETE' }); setToast('Phone deleted'); await loadData(); }
    catch (deleteError) { setError(deleteError.message); }
  };
  const saveService = async (service) => {
    await api(editorService?.id ? `/api/admin/services/${editorService.id}` : '/api/admin/services', {
      method: editorService?.id ? 'PUT' : 'POST', body: JSON.stringify(service),
    });
    setEditorService(undefined); setToast('Repair service saved'); await loadData();
  };
  const removeService = async (service) => {
    if (!window.confirm(`Delete ${service.name}?`)) return;
    try { await api(`/api/admin/services/${service.id}`, { method: 'DELETE' }); setToast('Service deleted'); await loadData(); }
    catch (deleteError) { setError(deleteError.message); }
  };
  const changeStatus = async (order, status) => {
    try { await api(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadData(); }
    catch (statusError) { setError(statusError.message); }
  };
  const logout = async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); setUsername(''); };

  const filteredProducts = useMemo(() => products.filter((product) => `${product.brand} ${product.model}`.toLowerCase().includes(productQuery.toLowerCase())), [products, productQuery]);
  const filteredOrders = useMemo(() => orders.filter((order) => orderFilter === 'All requests' || (orderFilter === 'Orders' ? order.type === 'order' : order.type === 'repair')), [orders, orderFilter]);
  const pendingCount = orders.filter((order) => ['New', 'Confirmed', 'Processing'].includes(order.status)).length;
  const revenue = orders.filter((order) => order.type === 'order' && order.status !== 'Cancelled').reduce((sum, order) => sum + order.price * order.quantity, 0);

  if (checkingSession) return <main className="admin-loading"><div className="loading-mark"><Smartphone size={23} /></div><p>Opening your workspace…</p></main>;
  if (!username) return <Login onLogin={() => api('/api/admin/session').then((session) => setUsername(session.username))} />;

  const heading = { overview: ['Good morning', 'Here’s what’s happening at your store today.'], products: ['Your phones', 'Keep your collection fresh and ready to sell.'], services: ['Repair services', 'Set what you fix and what customers see.'], orders: ['Orders & requests', 'Stay on top of every customer conversation.'] }[tab];

  return (
    <AdminFrame tab={tab} setTab={setTab} username={username} onLogout={logout}>
      <div className="admin-page-heading"><div><p className="eyebrow">{tab === 'overview' ? 'STORE PULSE' : `MANAGE / ${tab.toUpperCase()}`}</p><h1>{heading[0]}<span>{tab === 'overview' ? '.' : ''}</span></h1><p>{heading[1]}</p></div>{tab === 'products' && <button className="button button-dark" onClick={() => setEditorProduct(null)}><Plus size={17} /> Add a phone</button>}{tab === 'services' && <button className="button button-dark" onClick={() => setEditorService(null)}><Plus size={17} /> Add service</button>}</div>
      {error && <div className="admin-alert" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}
      {tab === 'overview' && <>
        <div className="stat-grid"><article className="stat-card"><span className="stat-icon stat-green"><Smartphone size={19} /></span><span className="stat-label">ACTIVE PHONES</span><strong>{products.length}</strong><small>{products.filter((phone) => phone.stock > 0).length} currently in stock</small></article><article className="stat-card"><span className="stat-icon stat-yellow"><Clock3 size={19} /></span><span className="stat-label">OPEN REQUESTS</span><strong>{pendingCount}</strong><small>Waiting for an update</small></article><article className="stat-card"><span className="stat-icon stat-lilac"><CircleDollarSign size={19} /></span><span className="stat-label">ORDER VALUE</span><strong>{money(revenue)}</strong><small>Excluding cancelled orders</small></article><article className="stat-card"><span className="stat-icon stat-blue"><Wrench size={19} /></span><span className="stat-label">REPAIR SERVICES</span><strong>{services.filter((service) => service.enabled).length}</strong><small>Visible on your storefront</small></article></div>
        <section className="admin-panel overview-requests"><div className="panel-heading"><div><h2>Latest requests</h2><p>Recent orders and repair bookings</p></div><button className="text-link" onClick={() => setTab('orders')}>View all <ArrowUpRight size={15} /></button></div>{orders.length ? <div className="compact-orders">{orders.slice(0, 5).map((order) => <div className="compact-order" key={order.id}><span className={`request-type-icon ${order.type}`} >{order.type === 'order' ? <Smartphone size={17} /> : <Wrench size={17} />}</span><span className="compact-order-main"><strong>{order.productName}</strong><small>{order.name} · {new Date(order.createdAt).toLocaleDateString()}</small></span><span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span><strong className="compact-price">{order.type === 'order' ? money(order.price * order.quantity) : order.price ? money(order.price) : 'Quote'}</strong></div>)}</div> : <EmptyState icon={PackageCheck} title="No requests just yet" detail="New orders and repair bookings will show up here." />}</section>
        <div className="quick-panels"><button className="quick-panel" onClick={() => setTab('products')}><span className="quick-panel-icon"><Boxes size={20} /></span><span><strong>Manage your phones</strong><small>Add a listing, change prices, and keep stock up to date.</small></span><ArrowUpRight size={18} /></button><button className="quick-panel" onClick={() => setTab('services')}><span className="quick-panel-icon quick-wrench"><Wrench size={20} /></span><span><strong>Update repair services</strong><small>Adjust what your technicians can help with.</small></span><ArrowUpRight size={18} /></button></div>
      </>}
      {tab === 'products' && <section className="admin-panel"><div className="panel-toolbar"><label className="admin-search"><Search size={17} /><input placeholder="Search your phones" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} /></label><span>{products.length} listings</span></div>{loading ? <div className="table-loading">Loading your inventory…</div> : filteredProducts.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>Phone</th><th>Price</th><th>Stock</th><th>Visibility</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><div className="table-product">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : <span className="table-image-fallback"><Smartphone size={17} /></span>}<span><strong>{product.brand} {product.model}</strong><small>{product.storage} · {product.color}</small></span></div></td><td><strong>{money(product.salePrice || product.price)}</strong>{product.salePrice && <small className="table-strike">{money(product.price)}</small>}</td><td><span className={`inventory-status ${product.stock ? 'available' : 'unavailable'}`}><i />{product.stock ? `${product.stock} units` : 'Out of stock'}</span></td><td><span className="visibility-tags">{product.featured && <span>Featured</span>}{product.isNew && <span>New</span>}{!product.featured && !product.isNew && <small>Standard</small>}</span></td><td><div className="row-actions"><button onClick={() => setEditorProduct(product)} aria-label={`Edit ${product.model}`} title="Edit"><Pencil size={16} /></button><button onClick={() => removeProduct(product)} aria-label={`Delete ${product.model}`} title="Delete"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={Smartphone} title="No phones found" detail={productQuery ? 'Try a different search.' : 'Add your first phone to get started.'} />}</section>}
      {tab === 'services' && <section className="admin-panel"><div className="panel-toolbar"><div><strong>Service list</strong><small>Only enabled services show on the customer website.</small></div><span>{services.length} services</span></div>{services.length ? <div className="service-admin-list">{services.map((service) => { const Icon = adminServiceIcons[service.icon] || Wrench; return <article className="service-admin-item" key={service.id}><span className="service-admin-icon"><Icon size={18} /></span><span className="service-admin-description"><strong>{service.name}</strong><small>{service.description}</small></span><strong>{service.price ? money(service.price) : 'Quote'}</strong><span className={`service-enabled ${service.enabled ? 'enabled' : ''}`}>{service.enabled ? 'Visible' : 'Hidden'}</span><div className="row-actions"><button onClick={() => setEditorService(service)} aria-label={`Edit ${service.name}`} title="Edit"><Pencil size={16} /></button><button onClick={() => removeService(service)} aria-label={`Delete ${service.name}`} title="Delete"><Trash2 size={16} /></button></div></article>; })}</div> : <EmptyState icon={Wrench} title="No repair services" detail="Add services to let customers book a repair." />}</section>}
      {tab === 'orders' && <section className="admin-panel"><div className="panel-toolbar"><div><strong>Customer activity</strong><small>{orders.length} total orders and requests</small></div><label className="filter-select admin-filter"><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}><option>All requests</option><option>Orders</option><option>Repairs</option></select><ChevronDown size={14} /></label></div>{filteredOrders.length ? <div className="table-scroll"><table className="admin-table orders-table"><thead><tr><th>Customer</th><th>Request</th><th>Received</th><th>Value</th><th>Status</th></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}><td><div className="customer-cell"><strong>{order.name}</strong><a href={`tel:${order.phone}`}>{order.phone}</a></div></td><td><div className="request-cell"><span className={`request-type-icon ${order.type}`}>{order.type === 'order' ? <Smartphone size={16} /> : <Wrench size={16} />}</span><span><strong>{order.productName}</strong><small>{order.type === 'order' ? `${order.quantity} × ${order.color} · ${order.fulfillment}` : order.details || 'Repair request'}</small></span></div></td><td>{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td><strong>{order.price ? money(order.price * order.quantity) : 'Quote'}</strong></td><td><label className="status-select-wrap"><select className={`status-select status-${order.status.toLowerCase()}`} value={order.status} onChange={(event) => changeStatus(order, event.target.value)} aria-label={`Status for ${order.name}`}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={13} /></label></td></tr>)}</tbody></table></div> : <EmptyState icon={PackageCheck} title="No matching requests" detail="Orders and repair requests will appear here as customers submit them." />}</section>}
      <div className="admin-bottom-note"><span><Check size={14} /> Changes publish to the customer website immediately.</span><a href="/">View storefront <ArrowUpRight size={13} /></a></div>
      {editorProduct !== undefined && <ProductEditor product={editorProduct} onClose={() => setEditorProduct(undefined)} onSave={saveProduct} />}
      {editorService !== undefined && <ServiceEditor service={editorService} onClose={() => setEditorService(undefined)} onSave={saveService} />}
      {toast && <div className="admin-toast" role="status"><Check size={16} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15} /></button></div>}
    </AdminFrame>
  );
}