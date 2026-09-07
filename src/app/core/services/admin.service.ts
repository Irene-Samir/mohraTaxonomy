import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GbifBatchImportResult {
  phylumKey: number;
  batchSize: number;
  startingOffset: number;
  nextOffset: number;
  processed: number;
  imported: number;
  enriched: number;
  skipped: number;
  failed: number;
  errors: string[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // ================= GBIF OPERATIONS =================

  /**
   * Get available GBIF animal data
   * GET /api/Gbif/animals
   */
  getGbifAnimals(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Gbif/animals`).pipe(
      catchError(error => this.handleError(error, 'Unable to load GBIF data.'))
    );
  }

  /**
   * Start GBIF full import
   * POST /api/Gbif/import
   */
  importGbifData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/Gbif/import`, {}, { responseType: 'text' }).pipe(
      catchError(error => this.handleError(error, 'GBIF data import failed.'))
    );
  }

  /**
   * Import species batch by phylum: POST /api/Gbif/import-by-phylum
   * Parameters: highertaxonKey (default 44), batchSize (default 1000), offset (default 0)
   */
  importGbifByPhylum(
    highertaxonKey: number = 44,
    batchSize: number = 1000,
    offset: number = 0
  ): Observable<GbifBatchImportResult> {
    const params = new HttpParams()
      .set('highertaxonKey', highertaxonKey.toString())
      .set('batchSize', batchSize.toString())
      .set('offset', offset.toString());

    return this.http.post<GbifBatchImportResult>(
      `${this.apiUrl}/Gbif/import-by-phylum`,
      {},
      { params }
    ).pipe(
      catchError(error => this.handleError(error, 'GBIF batch import failed.'))
    );
  }

  /**
   * Import a single animal by GBIF Key: POST /api/Gbif/import/{gbifKey}
   */
  importSingleAnimalByGbifKey(gbifKey: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/Gbif/import/${gbifKey}`,
      {}
    ).pipe(
      catchError(error => this.handleError(error, `Failed to import animal with GBIF key #${gbifKey}.`))
    );
  }

  // ================= IMAGE IMPORT OPERATIONS =================

  /**
   * Import GBIF External Images
   * POST /api/images/import-gbif
   */
  importGbifImages(): Observable<any> {
    return this.http.post(`${this.apiUrl}/images/import-gbif`, {}, { responseType: 'text' }).pipe(
      catchError(error => this.handleError(error, 'GBIF image import failed.'))
    );
  }

  /**
   * Import Wikimedia images for a specific animal
   * POST /api/images/import/{animalId}
   */
  importAnimalImages(animalId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/images/import/${animalId}`, {}, { responseType: 'text' }).pipe(
      catchError(error => this.handleError(error, `Failed to import images for animal #${animalId}.`))
    );
  }

  /**
   * Import Wikimedia images for all animals
   * POST /api/images/import-all
   */
  importAllAnimalImages(): Observable<any> {
    return this.http.post(`${this.apiUrl}/images/import-all`, {}, { responseType: 'text' }).pipe(
      catchError(error => this.handleError(error, 'Global image import failed.'))
    );
  }

  private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let message = defaultMessage;
    if (error.status === 401) {
      message = 'Unauthorized. Please sign in as an Admin.';
    } else if (error.status === 403) {
      message = 'Forbidden. Admin privileges are required for this action.';
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
