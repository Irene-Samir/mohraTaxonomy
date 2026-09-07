import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Category {
  id: number;
  name: string;
  rank: string;
  parentId?: number | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface CreateCategoryDto {
  name: string;
  rank: string;
  parentId?: number | null;
  description?: string | null;
  image?: File | null;
}

export interface UpdateCategoryDto {
  name: string;
  rank: string;
  parentId?: number | null;
  description?: string | null;
  image?: File | null;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/Category`;
  private readonly http = inject(HttpClient);

  private categoriesCache$: Observable<Category[]> | null = null;

  /**
   * Get all categories from API: GET /api/Category
   * Caches the response for performance across pages
   */
  getCategories(forceRefresh: boolean = false): Observable<Category[]> {
    if (!this.categoriesCache$ || forceRefresh) {
      this.categoriesCache$ = this.http.get<Category[]>(this.apiUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(error => {
          this.categoriesCache$ = null;
          return this.handleError(error, 'Unable to load categories.');
        })
      );
    }
    return this.categoriesCache$;
  }

  /**
   * Search categories in backend: GET /api/Category/search?query=...
   */
  searchCategories(query?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (query && query.trim()) {
      params = params.set('query', query.trim());
    }

    return this.http.get<Category[]>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(error =>
        this.handleError(error, 'Unable to search categories. Please try again.')
      )
    );
  }

  /**
   * Get Category by ID: GET /api/Category/{id}
   */
  getCategoryById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error, 'Unable to load this category.'))
    );
  }

  /**
   * Create category (Admin only): POST /api/Category
   * Multipart/form-data with Name, Rank, ParentId, Description, and optional Image
   */
  createCategory(dto: CreateCategoryDto): Observable<Category> {
    const formData = new FormData();
    formData.append('Name', dto.name);
    formData.append('Rank', dto.rank);
    if (dto.parentId != null && dto.parentId !== undefined) {
      formData.append('ParentId', dto.parentId.toString());
    }
    if (dto.description) {
      formData.append('Description', dto.description);
    }
    if (dto.image) {
      formData.append('Image', dto.image);
    }

    return this.http.post<Category>(this.apiUrl, formData).pipe(
      catchError(error => this.handleError(error, 'Unable to create category.'))
    );
  }

  /**
   * Update category (Admin only): PUT /api/Category/{id}
   * Multipart/form-data with Name, Rank, ParentId, Description, and optional Image
   */
  updateCategory(id: number, dto: UpdateCategoryDto): Observable<Category> {
    const formData = new FormData();
    formData.append('Name', dto.name);
    formData.append('Rank', dto.rank);
    if (dto.parentId != null && dto.parentId !== undefined) {
      formData.append('ParentId', dto.parentId.toString());
    }
    if (dto.description) {
      formData.append('Description', dto.description);
    }
    if (dto.image) {
      formData.append('Image', dto.image);
    }

    return this.http.put<Category>(`${this.apiUrl}/${id}`, formData).pipe(
      catchError(error => this.handleError(error, 'Unable to update category.'))
    );
  }

  /**
   * Delete category (Admin only): DELETE /api/Category/{id}
   */
  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error, 'Unable to delete category. Check if it has sub-categories or assigned animals.'))
    );
  }

  private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let message = defaultMessage;
    if (error.status === 401) {
      message = 'Unauthorized. Please sign in as an Admin.';
    } else if (error.status === 403) {
      message = 'Forbidden. Admin permissions required.';
    } else if (error.status === 409) {
      message = 'Conflict. This category cannot be deleted because it is referenced by animals or sub-categories.';
    } else if (error.status === 0) {
      message = `Unable to connect to the server at ${environment.baseUrl}. Please verify the API is running.`;
    } else if (typeof error.error === 'string' && error.error.trim()) {
      message = error.error;
    } else if (error.error?.message) {
      message = error.error.message;
    }
    return throwError(() => new Error(message));
  }
}
