import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
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

  private readonly storageKey = 'mohra_favorites';

  // Reactive signals for synchronous UI lookups
  public favoriteAnimalIdsSignal = signal<Set<number>>(new Set<number>());
  public favoriteCategoryIdsSignal = signal<Set<number>>(new Set<number>());

  constructor() {
    // Initial sync
    if (this.isBrowser()) {
      this.loadLocalFavorites();
      this.authService.isAuthenticated$.subscribe(isAuth => {
        if (isAuth) {
          this.refreshFavorites();
        }
      });
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
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
    return this.http.get<FavoriteAnimal[]>(`${this.apiUrl}/FavoriteAnimals`).pipe(
      tap(list => {
        if (Array.isArray(list)) {
          const ids = new Set(list.map(f => f.animalId));
          this.favoriteAnimalIdsSignal.set(ids);
          this.saveLocalFavorites(Array.from(ids));
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
    return this.http.post(`${this.apiUrl}/FavoriteAnimals`, { animalId }, { responseType: 'text' }).pipe(
      tap(() => {
        const current = new Set(this.favoriteAnimalIdsSignal());
        current.add(animalId);
        this.favoriteAnimalIdsSignal.set(current);
        this.saveLocalFavorites(Array.from(current));
      }),
      catchError(error => this.handleError(error, 'Unable to add animal to favorites.'))
    );
  }

  /**
   * Remove animal from favorites:
   * DELETE /api/FavoriteAnimals/{animalId}
   */
  removeFavoriteAnimal(animalId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/FavoriteAnimals/${animalId}`).pipe(
      tap(() => {
        const current = new Set(this.favoriteAnimalIdsSignal());
        current.delete(animalId);
        this.favoriteAnimalIdsSignal.set(current);
        this.saveLocalFavorites(Array.from(current));
      }),
      catchError(error => this.handleError(error, 'Unable to remove animal from favorites.'))
    );
  }

  /**
   * Check if animal ID is marked as favorite
   */
  isFavorite(animalId: number): boolean {
    return this.favoriteAnimalIdsSignal().has(animalId);
  }

  /**
   * Toggle animal favorite state
   */
  toggleFavorite(animalId: number): Observable<boolean> {
    if (this.isFavorite(animalId)) {
      return this.removeFavoriteAnimal(animalId).pipe(
        map(() => false),
        catchError(() => {
          // If unauthenticated or offline, toggle locally
          this.toggleLocalAnimal(animalId);
          return of(false);
        })
      );
    } else {
      return this.addFavoriteAnimal(animalId).pipe(
        map(() => true),
        catchError(() => {
          // If unauthenticated or offline, toggle locally
          this.toggleLocalAnimal(animalId);
          return of(true);
        })
      );
    }
  }

  // ================= FAVORITE CATEGORIES =================

  /**
   * Get authenticated user's favorite categories from backend:
   * GET /api/FavoriteCategories
   */
  getFavoriteCategories(): Observable<FavoriteCategory[]> {
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
    return this.favoriteCategoryIdsSignal().has(categoryId);
  }

  /**
   * Toggle category favorite state
   */
  toggleFavoriteCategory(categoryId: number): Observable<boolean> {
    if (this.isCategoryFavorite(categoryId)) {
      return this.removeFavoriteCategory(categoryId).pipe(map(() => false));
    } else {
      return this.addFavoriteCategory(categoryId).pipe(map(() => true));
    }
  }

  // ================= LOCAL FALLBACK =================

  private loadLocalFavorites(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const ids = parsed.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
          this.favoriteAnimalIdsSignal.set(new Set(ids));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  private saveLocalFavorites(ids: number[]): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(ids));
    } catch (e) {
      console.error(e);
    }
  }

  private toggleLocalAnimal(animalId: number): void {
    const current = new Set(this.favoriteAnimalIdsSignal());
    if (current.has(animalId)) {
      current.delete(animalId);
    } else {
      current.add(animalId);
    }
    this.favoriteAnimalIdsSignal.set(current);
    this.saveLocalFavorites(Array.from(current));
  }

  private handleError(error: HttpErrorResponse, defaultMsg: string): Observable<never> {
    let msg = defaultMsg;
    if (error.status === 401) {
      msg = 'Please sign in to manage your favorites.';
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
