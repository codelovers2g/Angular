/**
 * Latest Version Used: Angular 19.x
 * File Purpose: Comprehensive Product Catalog with Search, Filters, and Resource API
 * Created Date: 2026-04-17
 * Mark as LATEST VERSION REFERENCE
 */

import { Component, signal, computed, effect, inject, resource, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, query, style, transition, trigger, stagger } from '@angular/animations';
import { FormsModule } from '@angular/forms';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  inStock: boolean;
}

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(50, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="catalog-container">
      <header class="glass-header">
        <div class="header-content">
          <h1>FutureTech <span>Catalog</span></h1>
          <div class="controls">
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)" 
              placeholder="Search gadgets..."
              class="search-input"
            />
            <select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" class="category-select">
              <option value="All">All Categories</option>
              <option value="Gear">Gear</option>
              <option value="IO">Peripherals</option>
            </select>
          </div>
          <div class="cart-pill">
            <i class="shopping-icon"></i>
            <span>{{ cartCount() }} items | {{ total() | currency }}</span>
          </div>
        </div>
      </header>

      <main>
        @if (productsResource.isLoading()) {
          <div class="skeleton-grid">
            @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton-card"></div> }
          </div>
        } @else {
          <div class="product-grid" [@listAnimation]="filteredProducts().length">
            @for (product of filteredProducts(); track product.id) {
              <div 
                class="product-card" 
                [class.selected]="selectedId() === product.id" 
                (click)="selectedId.set(product.id)"
              >
                <div class="badge" [class.out]="!product.inStock">
                  {{ product.inStock ? 'Available' : 'Sold Out' }}
                </div>
                <h3>{{ product.name }}</h3>
                <p>{{ product.description }}</p>
                <div class="card-footer">
                  <span class="price">{{ product.price | currency }}</span>
                  <button (click)="addToCart(product); $event.stopPropagation()">Add</button>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <p>No matches found for "{{ searchQuery() }}"</p>
                <button (click)="resetFilters()">Clear All Filters</button>
              </div>
            }
          </div>
        }

        @if (selectedProduct(); as selected) {
          @defer (on timer(200ms)) {
            <aside class="detail-panel">
              <h2>{{ selected.name }} Details</h2>
              <p>Type: {{ selected.category }}</p>
              <div class="tag-cloud">
                <span>NEW</span><span>PREMIUM</span><span>WARRANTY</span>
              </div>
            </aside>
          }
        }
      </main>
    </div>
  `,
  styles: [`
    :host { --primary: #6366f1; --bg: #f8fafc; --text: #1e293b; }
    .catalog-container { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; padding: 2rem; }
    .glass-header { 
      background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); 
      border-radius: 20px; padding: 1.5rem 2rem; margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); sticky: top; top: 1rem; z-index: 10;
    }
    .header-content { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
    h1 span { color: var(--primary); }
    .search-input, .category-select { 
      padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; transition: 0.2s;
    }
    .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }
    .product-card { 
      background: white; border-radius: 20px; padding: 2rem; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; border: 1px solid transparent; 
    }
    .product-card:hover { transform: translateY(-8px); box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border-color: #e2e8f0; }
    .product-card.selected { border-color: var(--primary); background: #f5f3ff; }
    .badge { position: absolute; top: 1rem; right: 1rem; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 99px; background: #dcfce7; color: #166534; }
    .badge.out { background: #fee2e2; color: #991b1b; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; }
    .price { font-size: 1.5rem; font-weight: 700; }
    button { background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    button:hover { background: #4f46e5; }
    .detail-panel { margin-top: 3rem; animation: slideIn 0.4s ease; background: white; padding: 2rem; border-radius: 20px; border: 1px dashed #cbd5e1; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProductCatalogComponent {
  // Reactive Signals for filters
  searchQuery = signal('');
  categoryFilter = signal('All');
  cart = signal<Product[]>([]);

  //  Angular 19+ Signal Patterns

  productsResource = resource({
    request: () => ({ category: this.categoryFilter() }),
    loader: async ({ request }) => {
      const resp = await fetch(`https://api.example.com/products?cat=${request.category}`);
      return resp.ok ? await resp.json() : [
        { id: 1, name: 'Neural Link Gen 5', price: 299, description: 'VR interface', category: 'Gear', inStock: true },
        { id: 2, name: 'Quantum Core Mouse', price: 89, description: 'Hyper optics', category: 'IO', inStock: false }
       ] as Product[];
    }
  });
  selectedId = linkedSignal({
    source: () => this.productsResource.value()?.[0]?.id ?? null,
    computation: (id) => id
  });
  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return (this.productsResource.value() ?? []).filter(p => p.name.toLowerCase().includes(query));
  });
  selectedProduct = computed(() => this.productsResource.value()?.find(p => p.id === this.selectedId()));
  cartCount = computed(() => this.cart().length); total = computed(() => this.cart().reduce((acc, v) => acc + v.price, 0));
  addToCart(product: Product) { this.cart.update(curr => [...curr, product]); }

  resetFilters() {
    this.searchQuery.set('');
    this.categoryFilter.set('All');
  }
}
