import { Component, signal, computed, inject, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, query, style, transition, trigger, stagger } from '@angular/animations';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-catalog.component.html',
  styleUrls: ['./product-catalog.component.css'],
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
  ]
})
export class ProductCatalogComponent {
  private productService = inject(ProductService);

  // Reactive Signals for UI state
  searchQuery = signal('');
  categoryFilter = signal('All');
  cart = signal<Product[]>([]);

  // Signal Resource Declarative data fetching that automatically reacts to `categoryFilter` changes.
  productsResource = this.productService.getProducts(() => this.categoryFilter());

  /*
   Linked Signal Efficiently resets selection whenever the product list changes.
   Prevents stale state (e.g., keeping a selected item that is no longer filtered).
   */
  selectedId = linkedSignal({
    source: () => this.productsResource.value()?.[0]?.id ?? null,
    computation: (newFirstId, previousSelectedId) => {
      // Logic could be expanded here to keep existing selection if it still exists
      return newFirstId;
    }
  });

  // Derived state using computed signals
  filteredProducts = computed(() => {
    const rawData = this.productsResource.value() ?? [];
    const query = this.searchQuery().toLowerCase().trim();
    
    if (!query) return rawData;
    return rawData.filter(p => p.name.toLowerCase().includes(query));
  });

  selectedProduct = computed(() => 
    this.productsResource.value()?.find(p => p.id === this.selectedId())
  );
  
  cartCount = computed(() => this.cart().length);
  total = computed(() => this.cart().reduce((acc, v) => acc + v.price, 0));

  addToCart(product: Product) {
    this.cart.update(curr => [...curr, product]);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.categoryFilter.set('All');
  }
}
