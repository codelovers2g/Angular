import { Component } from '@angular/core';
import { ProductCatalogComponent } from './features/products/product-catalog/product-catalog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ProductCatalogComponent],
  template: `
    <app-product-catalog></app-product-catalog>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {
  title = 'angular-product-catalog';
}
