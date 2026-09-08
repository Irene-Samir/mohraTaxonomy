import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FavoriteService } from './favorite.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let httpMock: HttpTestingController;
  let authSubject: BehaviorSubject<boolean>;
  let mockRouter: { navigate: any; url: string };
  let mockToastService: { show: any; clear: any };

  beforeEach(() => {
    TestBed.resetTestingModule();

    authSubject = new BehaviorSubject<boolean>(false);

    const authMock = {
      isAuthenticated: vi.fn(() => authSubject.value),
      isAuthenticated$: authSubject.asObservable()
    };

    mockRouter = {
      navigate: vi.fn(),
      url: '/animals/42'
    };

    mockToastService = {
      show: vi.fn(),
      clear: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FavoriteService,
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: mockRouter },
        { provide: ToastService, useValue: mockToastService }
      ]
    });

    service = TestBed.inject(FavoriteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Unauthenticated / Guest user', () => {
    it('should return false for isFavorite when not logged in', () => {
      expect(service.isFavorite(10)).toBe(false);
    });

    it('should return false for isCategoryFavorite when not logged in', () => {
      expect(service.isCategoryFavorite(5)).toBe(false);
    });

    it('should not call HTTP and redirect to /login with returnUrl on toggleFavorite', async () => {
      const resultPromise = firstValueFrom(service.toggleFavorite(10));
      const result = await resultPromise;

      expect(result).toBe(false);
      expect(mockToastService.show).toHaveBeenCalledWith('Please log in to add animals to your favorites.', 'warning');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          returnUrl: '/animals/42',
          message: 'Please log in to add animals to your favorites.'
        }
      });

      // Verify no HTTP requests were made
      httpMock.expectNone(`${environment.apiUrl}/FavoriteAnimals`);
    });

    it('should not call HTTP and redirect to /login on toggleFavoriteCategory', async () => {
      const resultPromise = firstValueFrom(service.toggleFavoriteCategory(5));
      const result = await resultPromise;

      expect(result).toBe(false);
      expect(mockToastService.show).toHaveBeenCalledWith('Please log in to add categories to your favorites.', 'warning');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          returnUrl: '/animals/42',
          message: 'Please log in to add categories to your favorites.'
        }
      });

      httpMock.expectNone(`${environment.apiUrl}/FavoriteCategories`);
    });

    it('should return empty array and not call HTTP on getFavoriteAnimals', async () => {
      const listPromise = firstValueFrom(service.getFavoriteAnimals());
      const list = await listPromise;

      expect(list).toEqual([]);
      httpMock.expectNone(`${environment.apiUrl}/FavoriteAnimals`);
    });
  });

  describe('Authenticated user', () => {
    beforeEach(() => {
      authSubject.next(true);

      // refreshFavorites is triggered on authentication
      const reqAnimals = httpMock.expectOne(`${environment.apiUrl}/FavoriteAnimals`);
      expect(reqAnimals.request.method).toBe('GET');
      reqAnimals.flush([]);

      const reqCats = httpMock.expectOne(`${environment.apiUrl}/FavoriteCategories`);
      expect(reqCats.request.method).toBe('GET');
      reqCats.flush([]);
    });

    it('should send POST request and add animal ID to signal on addFavoriteAnimal', () => {
      service.addFavoriteAnimal(10).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/FavoriteAnimals`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ animalId: 10 });
      req.flush('Added successfully');

      expect(service.isFavorite(10)).toBe(true);
    });

    it('should send DELETE request and remove animal ID from signal on removeFavoriteAnimal', () => {
      service.favoriteAnimalIdsSignal.set(new Set([10, 20]));

      service.removeFavoriteAnimal(10).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/FavoriteAnimals/10`);
      expect(req.request.method).toBe('DELETE');
      req.flush('Removed successfully');

      expect(service.isFavorite(10)).toBe(false);
      expect(service.isFavorite(20)).toBe(true);
    });

    it('should populate favorite signals from getFavoriteAnimals', () => {
      const mockList = [
        { id: 1, animalId: 10, animalName: 'Lion', createdAt: '2025-01-01' },
        { id: 2, animalId: 25, animalName: 'Tiger', createdAt: '2025-01-02' }
      ];

      service.getFavoriteAnimals().subscribe(list => {
        expect(list.length).toBe(2);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/FavoriteAnimals`);
      expect(req.request.method).toBe('GET');
      req.flush(mockList);

      expect(service.isFavorite(10)).toBe(true);
      expect(service.isFavorite(25)).toBe(true);
      expect(service.isFavorite(99)).toBe(false);
    });

    it('should clear signals when user logs out', () => {
      service.favoriteAnimalIdsSignal.set(new Set([10, 20]));
      service.favoriteCategoryIdsSignal.set(new Set([1, 2]));

      // User logs out
      authSubject.next(false);

      expect(service.favoriteAnimalIdsSignal().size).toBe(0);
      expect(service.favoriteCategoryIdsSignal().size).toBe(0);
      expect(service.isFavorite(10)).toBe(false);
    });
  });
});
