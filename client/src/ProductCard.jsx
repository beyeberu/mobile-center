import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { money } from './api.js';

export default function ProductCard({ product, onDetails, onOrder }) {
  return (
    <article className="product-card">
      <button className="product-image-button" onClick={() => onDetails(product)} aria-label={`View ${product.brand} ${product.model}`}>
        <div className="product-image-wrap">
          {product.images?.[0] ? <img src={product.images[0]} alt={`${product.brand} ${product.model}`} loading="lazy" /> : <div className="image-fallback">MC</div>}
          <div className="product-badges">
            {product.isNew && <span className="badge badge-new">NEW</span>}
            {product.salePrice && <span className="badge badge-sale">SAVE {money(product.price - product.salePrice)}</span>}
          </div>
          <span className="image-arrow"><ArrowUpRight size={18} /></span>
        </div>
      </button>
      <div className="product-card-info">
        <div className="product-meta"><span>{product.brand}</span><span className={product.stock ? 'stock-in' : 'stock-out'}>{product.stock ? 'In stock' : 'Sold out'}</span></div>
        <h3>{product.model}</h3>
        <p className="product-specs">{product.storage} · {product.ram} RAM · {product.color}</p>
        <div className="product-card-bottom">
          <div className="product-prices">
            <strong>{money(product.salePrice || product.price)}</strong>
            {product.salePrice && <del>{money(product.price)}</del>}
          </div>
          <button className="card-order" onClick={() => onOrder(product)} disabled={!product.stock} aria-label={`Order ${product.model}`}><span>Order now</span><ShoppingBag size={15} /></button>
        </div>
      </div>
    </article>
  );
}