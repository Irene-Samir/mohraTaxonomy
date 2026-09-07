import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Animal {
  id: number;
  name: string;
  scientificName: string;
  description: string | null;
  habitat: string | null;
  diet: string | null;
  categoryId: number;
  categoryName: string;
  // Optional UI helper properties
  firstImageUrl?: string | null;
  imagesLoading?: boolean;
}

export interface CreateAnimalDto {
  name: string;
  scientificName?: string | null;
  description?: string | null;
  habitat?: string | null;
  diet?: string | null;
  categoryId: number;
}

export interface UpdateAnimalDto {
  name: string;
  scientificName?: string | null;
  description?: string | null;
  habitat?: string | null;
  diet?: string | null;
  categoryId: number;
}

export interface AnimalImage {
  id: number;
  imageUrl: string;
  type?: string | null;
  description?: string | null;
}

export interface TaxonomyNode {
  id: number;
  name: string;
  rank: string;
}

export interface AnimalCommonName {
  id: number;
  name: string;
  language?: string | null;
  country?: string | null;
  source?: string | null;
}

export interface AnimalDescription {
  id: number;
  type: string;
  description: string;
  language?: string | null;
  source?: string | null;
}

export interface AnimalDistribution {
  id: number;
  locality?: string | null;
  country?: string | null;
  status?: string | null;
  establishmentMeans?: string | null;
  threatStatus?: string | null;
  source?: string | null;
}

export interface AnimalReference {
  id: number;
  citation: string;
  doi?: string | null;
  source?: string | null;
}

export interface AnimalFullDetail {
  id: number;
  gbifKey: number;
  name: string;
  scientificName?: string | null;
  authorship?: string | null;
  description?: string | null;
  habitat?: string | null;
  diet?: string | null;

  iucnCategory?: string | null;
  iucnCode?: string | null;
  isExtinct?: boolean | null;
  isMarine?: boolean | null;
  isFreshwater?: boolean | null;
  isTerrestrial?: boolean | null;
  livingPeriod?: string | null;

  categoryId: number;
  categoryName?: string | null;

  taxonomyHierarchy: TaxonomyNode[];
  images: AnimalImage[];
  commonNames: AnimalCommonName[];
  descriptions: AnimalDescription[];
  distributions: AnimalDistribution[];
  references: AnimalReference[];
}

@Injectable({
  providedIn: 'root'
})
export class AnimalService {
  private readonly apiUrl = `${environment.apiUrl}/Animal`;
  private readonly imageApiUrl = `${environment.apiUrl}/AnimalImage`;
  private readonly http = inject(HttpClient);

  /**
   * Get all animals from backend: GET /api/Animal
   */
  getAnimals(page: number = 1, pageSize: number = 24): Observable<Animal[]> {
    return this.http.get<Animal[]>(
      `${this.apiUrl}?page=${page}&pageSize=${pageSize}`
    ).pipe(
      catchError(error =>
        this.handleError(error, 'Unable to load animals. Please try again.')
      )
    );
  }

  /**
   * Search animals across all animals in the database: GET /api/Animal/search
   * Matches common name, scientific name, or category character-by-character
   */
  searchAnimals(
    query?: string,
    category?: string,
    categoryId?: number,
    page: number = 1,
    pageSize: number = 24
  ): Observable<Animal[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (query && query.trim()) {
      params = params.set('query', query.trim());
    }
    if (category && category.trim()) {
      params = params.set('category', category.trim());
    }
    if (categoryId != null && categoryId > 0) {
      params = params.set('categoryId', categoryId.toString());
    }

    return this.http.get<Animal[]>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(error =>
        this.handleError(error, 'Unable to search animals. Please try again.')
      )
    );
  }

  /**
   * Get a specific animal by its ID: GET /api/Animal/{id}
   */
  getAnimalById(id: number): Observable<Animal> {
    return this.http.get<Animal>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error, 'Unable to load this animal.'))
    );
  }

  /**
   * Get complete animal rich details: GET /api/Animal/{id}/full-details
   */
  getAnimalFullDetails(id: number): Observable<AnimalFullDetail> {
    return this.http.get<AnimalFullDetail>(`${this.apiUrl}/${id}/full-details`).pipe(
      catchError(error => this.handleError(error, 'Unable to load full animal details.'))
    );
  }

  /**
   * Create a new animal (Admin only): POST /api/Animal
   */
  createAnimal(dto: CreateAnimalDto): Observable<Animal> {
    return this.http.post<Animal>(this.apiUrl, dto).pipe(
      catchError(error => this.handleError(error, 'Unable to create animal.'))
    );
  }

  /**
   * Update an existing animal (Admin only): PUT /api/Animal/{id}
   */
  updateAnimal(id: number, dto: UpdateAnimalDto): Observable<Animal> {
    return this.http.put<Animal>(`${this.apiUrl}/${id}`, dto).pipe(
      catchError(error => this.handleError(error, 'Unable to update animal.'))
    );
  }

  /**
   * Delete an animal (Admin only): DELETE /api/Animal/{id}
   */
  deleteAnimal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error, 'Unable to delete animal. Check if images or related records exist.'))
    );
  }

  /**
   * Get all images for a specific animal: GET /api/AnimalImage/{animalId}
   */
  getAnimalImages(animalId: number): Observable<AnimalImage[]> {
    return this.http.get<AnimalImage[]>(`${this.imageApiUrl}/${animalId}`).pipe(
      catchError(error => this.handleError(error, 'Unable to load animal images.'))
    );
  }

  /**
   * Upload an image for a specific animal (Admin only): POST /api/AnimalImage/{animalId}
   * Multipart/form-data with Image (binary) and Description
   */
  uploadAnimalImage(animalId: number, file: File, description?: string): Observable<AnimalImage> {
    const formData = new FormData();
    formData.append('Image', file);
    if (description) {
      formData.append('Description', description);
    }

    return this.http.post<AnimalImage>(`${this.imageApiUrl}/${animalId}`, formData).pipe(
      catchError(error => this.handleError(error, 'Failed to upload animal image.'))
    );
  }

  /**
   * Delete an animal image (Admin only): DELETE /api/AnimalImage/{imageId}
   */
  deleteAnimalImage(imageId: number): Observable<any> {
    return this.http.delete(`${this.imageApiUrl}/${imageId}`).pipe(
      catchError(error => this.handleError(error, 'Failed to delete animal image.'))
    );
  }

  private animalsCountCache$: Observable<number> | null = null;

  /**
   * Get total animal count: GET /api/Animal/count
   * Caches the response for performance
   */
  getAnimalsCount(forceRefresh: boolean = false): Observable<number> {
    if (!this.animalsCountCache$ || forceRefresh) {
      this.animalsCountCache$ = this.http.get<number>(`${this.apiUrl}/count`).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(error => {
          this.animalsCountCache$ = null;
          return this.handleError(error, 'Unable to load animal count.');
        })
      );
    }
    return this.animalsCountCache$;
  }

  /**
   * Centralized error handler returning user-friendly messages
   */
  private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let message = defaultMessage;
    if (error.status === 401) {
      message = 'Unauthorized. Please sign in as an Admin.';
    } else if (error.status === 403) {
      message = 'Forbidden. You do not have administrator permissions.';
    } else if (error.status === 409) {
      message = 'Conflict. This record cannot be deleted because dependent items (such as images) reference it.';
    } else if (error.status === 404) {
      message = 'The requested record or image was not found.';
    } else if (error.status === 0) {
      message = `Unable to connect to the server at ${environment.baseUrl}. Please check if the API is running.`;
    } else if (typeof error.error === 'string' && error.error.trim()) {
      message = error.error;
    } else if (error.error?.message) {
      message = error.error.message;
    }
    return throwError(() => new Error(message));
  }
}
