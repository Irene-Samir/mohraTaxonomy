import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  university?: string;
  faculty?: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token?: string;
  expiration?: string;
  email?: string;
  fullName?: string;
  university?: string;
  faculty?: string;
  roles?: string[];
  message?: string;
  user?: {
    id?: string;
    email?: string;
    fullName?: string;
    university?: string;
    faculty?: string;
  };
  id?: string;
}

export interface User {
  email?: string;
  fullName?: string;
  university?: string;
  faculty?: string;
  id?: string;
  roles?: string[];
}

export interface FacultyStat {
  faculty: string;
  count: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/Auth`;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Parse JWT payload without external library
   */
  private decodeJwtToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  /**
   * Load user from localStorage if running on browser
   */
  private loadUserFromStorage(): void {
    if (!this.isBrowser()) return;

    try {
      const storedUser = localStorage.getItem('currentUser');
      const storedToken = localStorage.getItem('authToken');

      if (storedUser) {
        const user = JSON.parse(storedUser) as User;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } else if (storedToken) {
        const payload = this.decodeJwtToken(storedToken);
        if (payload) {
          const user: User = {
            id: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || payload.id,
            email: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email,
            fullName: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name || payload.fullName,
            university: payload.university || payload.University,
            faculty: payload.faculty || payload.Faculty,
            roles: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] 
              ? (Array.isArray(payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) 
                  ? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] 
                  : [payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']])
              : []
          };
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
          this.isAuthenticatedSubject.next(true);
        }
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
      this.logout();
    }
  }

  /**
   * Login with email and password
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const request: LoginRequest = { email, password };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Register a new user
   */
  register(
    fullName: string,
    email: string,
    university: string,
    faculty: string,
    password: string,
    confirmPassword: string
  ): Observable<any> {
    const request: RegisterRequest = {
      fullName,
      email,
      university,
      faculty,
      password,
      confirmPassword
    };

    return this.http.post(`${this.apiUrl}/register`, request, { responseType: 'text' })
      .pipe(
        tap(response => {
          console.log('Registration successful:', response);
        }),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    let tokenPayload: any = null;
    if (response.token) {
      tokenPayload = this.decodeJwtToken(response.token);
    }

    const user: User = {
      email: response.email || response.user?.email || tokenPayload?.email || tokenPayload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      fullName: response.fullName || response.user?.fullName || tokenPayload?.name || tokenPayload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
      university: response.university || response.user?.university || tokenPayload?.university || tokenPayload?.University,
      faculty: response.faculty || response.user?.faculty || tokenPayload?.faculty || tokenPayload?.Faculty,
      id: response.id || response.user?.id || tokenPayload?.sub || tokenPayload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
      roles: response.roles || []
    };

    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);

    if (this.isBrowser()) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else {
      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        errorMessage = error.error;
      } else if (error.error && typeof error.error === 'object') {
        if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.title) {
          errorMessage = error.error.title;
        } else if (error.error.errors && typeof error.error.errors === 'object') {
          const firstKey = Object.keys(error.error.errors)[0];
          if (firstKey && Array.isArray(error.error.errors[firstKey])) {
            errorMessage = error.error.errors[firstKey][0];
          }
        }
      } else if (error.status === 401) {
        errorMessage = 'Invalid email or password.';
      } else if (error.status === 400) {
        errorMessage = 'Invalid registration details. Please verify your inputs.';
      } else if (error.status === 404) {
        errorMessage = 'Authentication service unavailable. Please try again later.';
      } else if (error.status === 500) {
        errorMessage = 'Server error encountered. Please try again later.';
      } else if (error.status === 0) {
        errorMessage = `Unable to connect to the server. Please verify if the API is running at ${environment.baseUrl}.`;
      }
    }

    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      originalError: error
    }));
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    if (this.isBrowser()) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
    this.router.navigate(['/login']);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get stored auth token
   */
  getAuthToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('authToken');
  }

  /**
   * Check if current user is an Admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.toLowerCase() === 'admin');
  }

  /**
   * Check if current user has a specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.toLowerCase() === role.toLowerCase());
  }

  /**
   * Get registered users count (Admin only)
   * GET /api/Auth/users/count
   */
  getUsersCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/users/count`).pipe(
      catchError(() => [0])
    );
  }

  /**
   * Get all registered users (Admin only)
   * GET /api/Auth/users
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Get user statistics grouped by faculty (Admin only)
   * GET /api/Auth/faculty-stats
   */
  getFacultyStats(): Observable<FacultyStat[]> {
    return this.http.get<FacultyStat[]>(`${this.apiUrl}/faculty-stats`).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Request password reset link
   * POST /api/Auth/forgot-password
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email }).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Reset password using token
   * POST /api/Auth/reset-password
   */
  resetPassword(payload: { email?: string; token: string; newPassword: string; confirmPassword: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, payload).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }
}
