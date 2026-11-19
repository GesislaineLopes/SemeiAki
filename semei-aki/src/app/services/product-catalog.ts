import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { Product, ProductSubmission } from '../models/product';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ProductCatalog {
  constructor(private readonly http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_URL}/products`);
  }

  addProduct(product: ProductSubmission): Observable<Product> {
    return this.http
      .post<{ product: Product }>(`${API_URL}/products`, product, { withCredentials: true })
      .pipe(map((response) => response.product));
  }
}
