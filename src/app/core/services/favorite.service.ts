import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

export interface FavoriteAnimal {
  id: number;
  animalId: number;
  animalName: string;
  createdAt: string;
  // UI enrichment
  scientificName?: string;
  categoryName?: string;
  imageUrl?: string | null;
  imageLoading?: boolean;
}

export interface FavoriteCategory {
  id: number;
  categoryId: number;
  categoryName: string;
  createdAt: string;
  // UI enrichment
  rank?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private readonly apiUrl = environment.apiUrl;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  private readonly storageKey = 'mohra_favorites';

  // Reactive signals for synchronous UI lookups
  public favoriteAnimalIdsSignal = signal<Set<number>>(new Set<number>());
  public favoriteCategoryIdsSignal = signal<Set<number>>(new Set<number>());

  constructor() {
    if (this.isBrowser()) {
      // Remove any legacy guest favorites stored in localStorage
      try {
        localStorage.removeItem(this.storageKey);
      } catch {}

      this.authService.isAuthenticated$.subscribe(isAuth => {
        if (isAuth) {
          this.refreshFavorites();
        } else {
          this.favoriteAnimalIdsSignal.set(new Set<number>());
          this.favoriteCategoryIdsSignal.set(new Set<number>());
          try {
            localStorage.removeItem(this.storageKey);
          } catch {}
        }
      });
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Notify unauthenticated user and redirect to login page
   */
  public promptLogin(message: string): void {
    this.toastService.show(message, 'warning');
    const returnUrl = this.router.url;
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: returnUrl && returnUrl !== '/login' ? returnUrl : '/animals',
        message
      }
    });
  }

  /**
   * Refresh favorite animals & categories from backend for the authenticated user
   */
  refreshFavorites(): void {
    if (!this.isBrowser() || !this.authService.isAuthenticated()) return;

    this.getFavoriteAnimals().subscribe({
      next: (list) => {
        const ids = new Set(list.map(f => f.animalId));
        this.favoriteAnimalIdsSignal.set(ids);
      },
      error: () => {}
    });

    this.getFavoriteCategories().subscribe({
      next: (list) => {
        const ids = new Set(list.map(f => f.categoryId));
        this.favoriteCategoryIdsSignal.set(ids);
      },
      error: () => {}
    });
  }

  // ================= FAVORITE ANIMALS =================

  /**
   * Get authenticated user's favorite animals from backend:
   * GET /api/FavoriteAnimals
   */
  getFavoriteAnimals(): Observable<FavoriteAnimal[]> {
    if (!this.authService.isAuthenticated()) {
      this.favoriteAnimalIdsSignal.set(new Set<number>());
      return of([]);
    }

    return this.http.get<FavoriteAnimal[]>(`${this.apiUrl}/FavoriteAnimals`).pipe(
      tap(list => {
        if (Array.isArray(list)) {
          const ids = new Set(list.map(f => f.animalId));
          this.favoriteAnimalIdsSignal.set(ids);
        }
      }),
      catchError(error => this.handleError(error, 'Unable to load favorite animals.'))
    );
  }

  /**
   * Add animal to favorites:
   * POST /api/FavoriteAnimals
   */
  addFavoriteAnimal(animalId: number): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      this.promptLogin('Please log in to add animals to your favorites.');
      return throwError(() => new Error('Please log in to add animals to your favorites.'));
    }

    return this.http.post(`${this.apiUrl}/FavoriteAnimals`, { animalId }, { responseType: 'text' }).pipe(
      tap(() => {
        const current = new Set(this.favoriteAnimalIdsSignal());
        current.add(animalId);
        this.favoriteAnimalIdsSignal.set(current);
      }),
      catchError(error => this.handleError(error, 'Unable to add animal to favorites.'))
    );
  }

  /**
   * Remove animal from favorites:
   * DELETE /api/FavoriteAnimals/{animalId}
   */
  removeFavoriteAnimal(animalId: number): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      this.promptLogin('Please log in to manage your favorites.');
      return throwError(() => new Error('Please log in to manage your favorites.'));
    }

    return this.http.delete(`${this.apiUrl}/FavoriteAnimals/${animalId}`).pipe(
      tap(() => {
        const current = new Set(this.favoriteAnimalIdsSignal());
        current.delete(animalId);
        this.favoriteAnimalIdsSignal.set(current);
      }),
      catchError(error => this.handleError(error, 'Unable to remove animal from favorites.'))
    );
  }

  /**
   * Check if animal ID is marked as favorite
   */
  isFavorite(animalId: number): boolean {
    if (!this.authService.isAuthenticated()) {
      return false;
    }
    return this.favoriteAnimalIdsSignal().has(animalId);
  }

  /**
   * Toggle animal favorite state
   */
  toggleFavorite(animalId: number): Observable<boolean> {
    if (!this.authService.isAuthenticated()) {
      this.promptLogin('Please log in to add animals to your favorites.');
      return of(false);
    }

    if (this.isFavorite(animalId)) {
      return this.removeFavoriteAnimal(animalId).pipe(
        map(() => false),
        catchError(() => of(false))
      );
    } else {
      return this.addFavoriteAnimal(animalId).pipe(
        map(() => true),
        catchError(() => of(false))
      );
    }
  }

  // ================= FAVORITE CATEGORIES =================

  /**
   * Get authenticated user's favorite categories from backend:
   * GET /api/FavoriteCategories
   */
  getFavoriteCategories(): Observable<FavoriteCategory[]> {
    if (!this.authService.isAuthenticated()) {
      this.favoriteCategoryIdsSignal.set(new Set<number>());
      return of([]);
    }

    return this.http.get<FavoriteCategory[]>(`${this.apiUrl}/FavoriteCategories`).pipe(
      tap(list => {
        if (Array.isArray(list)) {
          const ids = new Set(list.map(f => f.categoryId));
          this.favoriteCategoryIdsSignal.set(ids);
        }
      }),
      catchError(error => this.handleError(error, 'Unable to load favorite categories.'))
    );
  }

  /**
   * Add category to favorites:
   * POST /api/FavoriteCategories
   */
  addFavoriteCategory(categoryId: number): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      this.promptLogin('Please log in to add categories to your favorites.');
      return throwError(() => new Error('Please log in to add categories to your favorites.'));
    }

    return this.http.post(`${this.apiUrl}/FavoriteCategories`, { categoryId }, { responseType: 'text' }).pipe(
      tap(() => {
        const current = new Set(this.favoriteCategoryIdsSignal());
        current.add(categoryId);
        this.favoriteCategoryIdsSignal.set(current);
      }),
      catchError(error => this.handleError(error, 'Unable to add category to favorites.'))
    );
  }

  /**
   * Remove category from favorites:
   * DELETE /api/FavoriteCategories/{categoryId}
   */
  removeFavoriteCategory(categoryId: number): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      this.promptLogin('Please log in to manage your favorites.');
      return throwError(() => new Error('Please log in to manage your favorites.'));
    }

    return this.http.delete(`${this.apiUrl}/FavoriteCategories/${categoryId}`).pipe(
      tap(() => {
        const current = new Set(this.favoriteCategoryIdsSignal());
        current.delete(categoryId);
        this.favoriteCategoryIdsSignal.set(current);
      }),
      catchError(error => this.handleError(error, 'Unable to remove category from favorites.'))
    );
  }

  /**
   * Check if category ID is marked as favorite
   */
  isCategoryFavorite(categoryId: number): boolean {
    if (!this.authService.isAuthenticated()) {
      return false;
    }
    return this.favoriteCategoryIdsSignal().has(categoryId);
  }

  /**
   * Toggle category favorite state
   */
  toggleFavoriteCategory(categoryId: number): Observable<boolean> {
    if (!this.authService.isAuthenticated()) {
      this.promptLogin('Please log in to add categories to your favorites.');
      return of(false);
    }

    if (this.isCategoryFavorite(categoryId)) {
      return this.removeFavoriteCategory(categoryId).pipe(
        map(() => false),
        catchError(() => of(false))
      );
    } else {
      return this.addFavoriteCategory(categoryId).pipe(
        map(() => true),
        catchError(() => of(false))
      );
    }
  }

  private handleError(error: HttpErrorResponse, defaultMsg: string): Observable<never> {
    let msg = defaultMsg;
    if (error.status === 401) {
      msg = 'Please sign in to manage your favorites.';
      this.promptLogin('Please log in to add animals to your favorites.');
    } else if (error.status === 0) {
      msg = `Unable to connect to the server at ${environment.baseUrl}. Please verify the API is running.`;
    } else if (error.error && typeof error.error === 'string') {
      msg = error.error;
    } else if (error.error?.message) {
      msg = error.error.message;
    }
    return throwError(() => new Error(msg));
  }
}
