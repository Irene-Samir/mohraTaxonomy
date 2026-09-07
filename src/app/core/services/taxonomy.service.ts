import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { Animal } from './animal.service';
import { environment } from '../../../environments/environment';

export interface TaxonomyNode {
  id: number;
  name: string;
  rank: string;
  children: TaxonomyNode[];
  imageUrl?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TaxonomyService {
  private readonly apiUrl = `${environment.apiUrl}/Taxonomy`;
  private readonly http = inject(HttpClient);

  // Cached observable for taxonomy tree to avoid redundant backend calls
  private treeCache$: Observable<TaxonomyNode[]> | null = null;

  /**
   * Get the full recursive taxonomy tree from backend API:
   * GET /api/Taxonomy/tree
   * Caches response for performance across multiple pages.
   */
  getTaxonomyTree(forceRefresh: boolean = false): Observable<TaxonomyNode[]> {
    if (!this.treeCache$ || forceRefresh) {
      this.treeCache$ = this.http.get<TaxonomyNode[]>(`${this.apiUrl}/tree`).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(error => {
          this.treeCache$ = null; // Clear cache on error so subsequent attempts can retry
          return this.handleError(error, 'Unable to load taxonomy tree. Please try again.');
        })
      );
    }
    return this.treeCache$;
  }

  /**
   * Get all animals belonging to a specific category and all its descendant categories:
   * GET /api/Taxonomy/{categoryId}/animals
   */
  getAnimalsByCategory(categoryId: number): Observable<Animal[]> {
    return this.http.get<Animal[]>(`${this.apiUrl}/${categoryId}/animals`).pipe(
      catchError(error =>
        this.handleError(error, 'Unable to load animals for this category. Please try again.')
      )
    );
  }

  /**
   * Helper method to search for a node by ID and return both the node and its full ancestor path
   */
  findNodeAndPath(
    nodes: TaxonomyNode[],
    targetId: number,
    currentPath: TaxonomyNode[] = []
  ): { node: TaxonomyNode; path: TaxonomyNode[] } | null {
    for (const node of nodes) {
      const newPath = [...currentPath, node];
      if (node.id === targetId) {
        return { node, path: newPath };
      }
      if (node.children && node.children.length > 0) {
        const found = this.findNodeAndPath(node.children, targetId, newPath);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Helper method to recursively collect all descendant category IDs (including the node itself)
   */
  getDescendantCategoryIds(node: TaxonomyNode): number[] {
    let ids: number[] = [node.id];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        ids = ids.concat(this.getDescendantCategoryIds(child));
      }
    }
    return ids;
  }

  /**
   * Helper method to collect all categories in a flat list with their full paths
   */
  flattenTreeWithPaths(
    nodes: TaxonomyNode[],
    currentPath: TaxonomyNode[] = []
  ): Array<{ node: TaxonomyNode; path: TaxonomyNode[] }> {
    let result: Array<{ node: TaxonomyNode; path: TaxonomyNode[] }> = [];
    for (const node of nodes) {
      const newPath = [...currentPath, node];
      result.push({ node, path: newPath });
      if (node.children && node.children.length > 0) {
        result = result.concat(this.flattenTreeWithPaths(node.children, newPath));
      }
    }
    return result;
  }

  /**
   * Centralized error handler returning user-friendly messages
   */
  private handleError(error: HttpErrorResponse, defaultMessage: string): Observable<never> {
    let message = defaultMessage;
    if (error.status === 404) {
      message = 'The requested taxonomy hierarchy or category record was not found.';
    } else if (error.status === 0) {
      message = `Unable to connect to the server at ${environment.baseUrl}. Please check if the API is running.`;
    } else if (error.error && typeof error.error === 'string') {
      message = error.error;
    } else if (error.error?.message) {
      message = error.error.message;
    }
    return throwError(() => new Error(message));
  }
}
