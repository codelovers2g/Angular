import { Injectable, resource } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  
  // Angular 19 Signal Resource Uses the new `resource()` API for declarative data fetching.
  getProducts(categoryFilter: () => string) {
    return resource({
      request: () => ({ category: categoryFilter() }),
      loader: async ({ request, abortSignal }) => {
        // Demonstrate real API call with automatic cancellation support
        try {
          const resp = await fetch(`https://api.example.com/products?cat=${request.category}`, {
            signal: abortSignal
          });
          if (resp.ok) {
            return await resp.json() as Product[];
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('Request was cancelled by Angular Resource');
          } else {
            console.error('API fetch failed, falling back to mock data', error);
          }
        }

        // Simulate network latency for demonstration of loading states
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockProducts = [
          { id: 1, name: 'Neural Link Gen 5', price: 299, description: 'VR interface', category: 'Gear', inStock: true },
          { id: 2, name: 'Quantum Core Mouse', price: 89, description: 'Hyper optics', category: 'IO', inStock: false },
          { id: 3, name: 'Nebula Keyboard', price: 159, description: 'Mechanical switches', category: 'IO', inStock: true },
          { id: 4, name: 'Plasma Monitor', price: 499, description: '8K resolution', category: 'Gear', inStock: true },
          { id: 5, name: 'Sonic Headset', price: 129, description: '3D audio', category: 'IO', inStock: true },
          { id: 6, name: 'Titan Processor', price: 899, description: 'Next-gen computing', category: 'Gear', inStock: false }
        ] as Product[];

        return request.category === 'All' 
          ? mockProducts 
          : mockProducts.filter(p => p.category === request.category);
      }
    });
  }
}
