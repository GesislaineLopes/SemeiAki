import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ProductSubmission } from '../../models/product';
import { AuthService, apiErrorMessage } from '../../services/auth';
import type { ProducerProfile } from '../../services/auth';
import { ProductCatalog } from '../../services/product-catalog';

interface ProductForm {
  name: string;
  category: string;
  description: string;
  price: number | null;
  image: string;
}

@Component({
  selector: 'app-produtor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './produtor.html',
  styleUrl: './produtor.scss',
})
export class Produtor implements OnInit {
  readonly categories = ['Horta', 'Frutas', 'Grãos', 'Do Sítio', 'Animais'];

  product: ProductForm = this.createForm();
  producer: ProducerProfile | null = null;
  checkingSession = true;
  isPublishing = false;
  imageFileName = '';
  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly auth: AuthService,
    private readonly catalog: ProductCatalog,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.verifySession();
  }

  verifySession(): void {
    this.checkingSession = true;
    this.errorMessage = '';
    this.auth.getSession().subscribe({
      next: (producer) => {
        if (!producer) {
          this.checkingSession = false;
          void this.router.navigate(['/cadastro'], {
            queryParams: { redirect: '/produtor' },
          });
          return;
        }
        this.producer = producer;
        this.checkingSession = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.checkingSession = false;
        this.errorMessage = apiErrorMessage(
          error,
          'Não foi possível verificar sua conta. Confira se a API está em execução.',
        );
        this.changeDetector.markForCheck();
      },
    });
  }

  selectImage(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Escolha uma foto nos formatos JPG, PNG ou WEBP.';
      input.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      this.errorMessage = 'A foto deve ter no máximo 1 MB. Escolha uma imagem menor.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.errorMessage = 'Não foi possível carregar essa foto. Tente escolher outra.';
        return;
      }

      this.product.image = reader.result;
      this.imageFileName = file.name;
      this.errorMessage = '';
      this.changeDetector.markForCheck();
    };
    reader.onerror = () => {
      this.errorMessage = 'Não foi possível carregar essa foto. Tente escolher outra.';
      this.changeDetector.markForCheck();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeImage(input: HTMLInputElement): void {
    this.product.image = '';
    this.imageFileName = '';
    input.value = '';
  }

  publishProduct(imageInput?: HTMLInputElement): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.product.name.trim()) {
      this.errorMessage = 'Informe o nome do produto.';
      return;
    }
    const price = this.product.price;
    if (price === null || !Number.isFinite(price) || price <= 0) {
      this.errorMessage = 'Informe um preço maior que zero.';
      return;
    }

    const submission: ProductSubmission = {
      name: this.product.name.trim(),
      category: this.product.category,
      price,
      description: this.product.description.trim(),
      image: this.product.image,
    };
    this.isPublishing = true;
    this.catalog.addProduct(submission).subscribe({
      next: () => {
        this.isPublishing = false;
        this.successMessage = 'Produto anunciado! Ele já está disponível no catálogo.';
        this.imageFileName = '';
        if (imageInput) {
          imageInput.value = '';
        }
        this.product = this.createForm();
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.isPublishing = false;
        this.errorMessage = apiErrorMessage(error, 'Não foi possível anunciar o produto.');
          this.changeDetector.markForCheck();
        if (error instanceof HttpErrorResponse && error.status === 401) {
          void this.router.navigate(['/login'], {
            queryParams: { redirect: '/produtor' },
          });
        }
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (error: unknown) => {
        this.errorMessage = apiErrorMessage(error, 'Não foi possível sair da conta.');
        this.changeDetector.markForCheck();
      },
    });
  }

  private createForm(): ProductForm {
    return {
      name: '',
      category: 'Horta',
      description: '',
      price: null,
      image: '',
    };
  }
}
