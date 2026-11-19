import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

const API_URL = 'http://localhost:3000/api';

export interface ProducerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  site: string;
  city: string;
  location: string;
  reference: string;
}

export interface ProducerRegistration {
  name: string;
  email: string;
  password: string;
  phone: string;
  site: string;
  city: string;
  location: string;
  reference: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser: ProducerProfile | null = null;

  constructor(private readonly http: HttpClient) {}

  getSession(): Observable<ProducerProfile | null> {
    return this.http
      .get<{ user: ProducerProfile | null }>(`${API_URL}/auth/session`, {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.user),
        tap((user) => (this.currentUser = user)),
      );
  }

  register(data: ProducerRegistration): Observable<ProducerProfile> {
    return this.http
      .post<{ user: ProducerProfile }>(`${API_URL}/auth/register`, data, {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.user),
        tap((user) => (this.currentUser = user)),
      );
  }

  login(email: string, password: string, remember: boolean): Observable<ProducerProfile> {
    return this.http
      .post<{ user: ProducerProfile }>(
        `${API_URL}/auth/login`,
        { email, password, remember },
        { withCredentials: true },
      )
      .pipe(
        map((response) => response.user),
        tap((user) => (this.currentUser = user)),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${API_URL}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => (this.currentUser = null)));
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof HttpErrorResponse &&
    typeof error.error?.message === 'string'
  ) {
    return error.error.message;
  }
  return fallback;
}
