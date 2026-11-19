export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  unit?: string;
  producer: string;
  site: string;
  image: string;
  description?: string;
  city?: string;
  location?: string;
  phone?: string;
}

export interface ProductSubmission {
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
}
