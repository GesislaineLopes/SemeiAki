import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProductCatalog } from '../../services/product-catalog';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: ProductCatalog,
          useValue: {
            getProducts: () =>
              of([
                {
                  id: 'tomate',
                  name: 'Tomate da horta',
                  category: 'Horta',
                  price: 'R$ 7,00',
                  unit: 'kg',
                  producer: 'Seu Antônio · Fazenda Nova',
                  site: 'Fazenda Nova',
                  image: '',
                },
              ]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters products by producer name without requiring accents', () => {
    component.searchQuery = 'antonio';

    expect(component.filteredProducts.map((product) => product.name)).toEqual([
      'Tomate da horta',
    ]);
  });
});
