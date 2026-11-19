import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type { ProductSubmission } from '../../models/product';
import { AuthService } from '../../services/auth';
import { ProductCatalog } from '../../services/product-catalog';
import { Produtor } from './produtor';

describe('Produtor', () => {
  let submittedProduct: ProductSubmission | null;

  beforeEach(async () => {
    submittedProduct = null;
    await TestBed.configureTestingModule({
      imports: [Produtor],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getSession: () =>
              of({
                id: 'producer-1',
                name: 'Ana',
                email: 'ana@example.com',
                phone: '(87) 99999-1111',
                site: 'Sítio Lagoa',
                city: 'Afogados da Ingazeira',
                location: 'Comunidade Lagoa',
                reference: '',
              }),
            logout: () => of(undefined),
          },
        },
        {
          provide: ProductCatalog,
          useValue: {
            addProduct: (product: ProductSubmission) => {
              submittedProduct = product;
              return of({
                id: 'product-1',
                ...product,
                price: 'R$ 8,50',
                producer: 'Ana · Sítio Lagoa',
                site: 'Sítio Lagoa',
                image: '',
                city: 'Afogados da Ingazeira',
                location: 'Comunidade Lagoa',
                phone: '(87) 99999-1111',
              });
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('sends a product listing to the backend', () => {
    const fixture = TestBed.createComponent(Produtor);
    const component = fixture.componentInstance;
    component.product = {
      name: 'Macaxeira',
      category: 'Horta',
      description: 'Colhida nesta semana',
      price: 8.5,
      image: '',
    };

    component.publishProduct();

    expect(submittedProduct).toMatchObject({
      name: 'Macaxeira',
      category: 'Horta',
      price: 8.5,
      description: 'Colhida nesta semana',
    });
    expect(component.successMessage).toContain('disponível no catálogo');
  });
});
