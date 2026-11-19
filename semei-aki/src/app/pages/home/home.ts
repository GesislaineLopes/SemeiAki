import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../services/auth';
import type { Product } from '../../models/product';
import { ProductCatalog } from '../../services/product-catalog';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  readonly categories = ['Horta', 'Frutas', 'Grãos', 'Do Sítio', 'Animais'];
  products: Product[] = [];
  productsLoading = true;
  productsError = '';

  searchQuery = '';
  activeCategory = 'all';
  activeSite = 'all';
  menuOpen = false;

  constructor(
    private readonly catalog: ProductCatalog,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.catalog.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.productsLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.productsError = apiErrorMessage(
          error,
          'Não foi possível carregar os produtos. Confira se a API está em execução.',
        );
        this.productsLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  get sites(): string[] {
    return [...new Set(this.products.map((product) => product.site))];
  }

  get filteredProducts(): Product[] {
    const query = this.normalize(this.searchQuery);

    return this.products.filter((product) => {
      const matchesCategory =
        this.activeCategory === 'all' || product.category === this.activeCategory;
      const matchesSite = this.activeSite === 'all' || product.site === this.activeSite;
      const matchesSearch =
        query.length === 0 ||
        this.normalize(
          `${product.name} ${product.category} ${product.producer} ${product.site} ${product.city ?? ''} ${product.location ?? ''} ${product.description ?? ''}`,
        ).includes(query);

      return matchesCategory && matchesSite && matchesSearch;
    });
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim().length > 0 ||
      this.activeCategory !== 'all' ||
      this.activeSite !== 'all'
    );
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.activeCategory = 'all';
    this.activeSite = 'all';
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  whatsappLink(product: Product): string {
    const message = encodeURIComponent(
      `Olá! Vi ${product.name} no SemeiAki e gostaria de fazer um pedido.`,
    );
    const digits = product.phone?.replace(/\D/g, '') ?? '';
    const phone = digits.length > 0 && digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${phone}?text=${message}`;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }
}
