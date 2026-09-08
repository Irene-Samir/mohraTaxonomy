import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  AnimalService,
  Animal,
  AnimalImage
} from '../../core/services/animal.service';

import { FavoriteService } from '../../core/services/favorite.service';
import { TaxonomyService, TaxonomyNode } from '../../core/services/taxonomy.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface AnimalCardVM extends Animal {
  firstImageUrl: string | null;
  imageLoaded: boolean;
  imageLoading: boolean;
}

@Component({
  selector: 'app-animals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './animals.component.html',
  styleUrl: './animals.component.css'
})
export class AnimalsComponent implements OnInit, OnDestroy {
  private readonly animalService = inject(AnimalService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  // Live search debounced stream for API calls
  private readonly searchSubject$ = new Subject<string>();

  animals = signal<AnimalCardVM[]>([]);

  isLoading = signal<boolean>(true);
  isLoadingMore = signal<boolean>(false);
  isSearching = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  currentPage = signal<number>(1);
  readonly pageSize = 24;
  hasMoreAnimals = signal<boolean>(true);

  animalSearchQuery = signal<string>('');
  selectedCategory = signal<string>('all');

  // Backwards compatibility for any existing references
  searchQuery = computed(() => this.animalSearchQuery());

  // Taxonomy Category Filter state from URL query parameter
  selectedTaxonomyCategoryId = signal<number | null>(null);
  selectedTaxonomyNode = signal<TaxonomyNode | null>(null);
  selectedTaxonomyPath = signal<TaxonomyNode[]>([]);

  availableCategories = computed(() => {
    const list = this.animals();
    const categoriesSet = new Set<string>();

    for (const animal of list) {
      if (animal.categoryName && animal.categoryName.trim()) {
        categoriesSet.add(animal.categoryName.trim());
      }
    }

    return Array.from(categoriesSet).sort();
  });

  filteredAnimals = computed(() => {
    const list = this.animals();
    const categoryPill = this.selectedCategory().toLowerCase();

    if (categoryPill === 'all') {
      return list;
    }

    return list.filter(animal =>
      animal.categoryName != null && animal.categoryName.toLowerCase() === categoryPill
    );
  });

  ngOnInit(): void {
    // Setup debounced character-by-character search through API
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.performSearch(query);
      });

    // Listen for query parameters
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const q = params['q'] || params['search'] || params['animal'];
        const catPill = params['category'] || 'all';

        if (q) {
          this.animalSearchQuery.set(q);
        }
        if (catPill) {
          this.selectedCategory.set(catPill);
        }

        const catIdParam = params['categoryId'] || params['category_id'];
        if (catIdParam) {
          const catId = Number(catIdParam);
          if (!isNaN(catId)) {
            this.selectedTaxonomyCategoryId.set(catId);
            if (q) {
              this.performSearch(q);
            } else {
              this.loadAnimalsForCategory(catId);
            }
            return;
          }
        }

        // No categoryId in URL: regular mode or search mode
        this.selectedTaxonomyCategoryId.set(null);
        this.selectedTaxonomyNode.set(null);
        this.selectedTaxonomyPath.set([]);

        if (q) {
          this.performSearch(q);
        } else {
          this.loadAnimals();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAnimalSearchInput(term: string): void {
    this.animalSearchQuery.set(term);
    this.searchSubject$.next(term);
  }

  /**
   * Execute backend search across all animals in the database
   */
  private performSearch(query: string): void {
    const trimmed = query.trim();

    if (!trimmed) {
      this.isSearching.set(false);
      const catId = this.selectedTaxonomyCategoryId();
      if (catId) {
        this.loadAnimalsForCategory(catId);
      } else {
        this.loadAnimals();
      }
      return;
    }

    this.isSearching.set(true);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.currentPage.set(1);

    const categoryId = this.selectedTaxonomyCategoryId() || undefined;

    this.animalService
      .searchAnimals(trimmed, undefined, categoryId, 1, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Animal[]) => {
          const viewModels = this.createViewModels(data || []);
          this.animals.set(viewModels);
          this.isLoading.set(false);
          this.hasMoreAnimals.set(data != null && data.length >= this.pageSize);
          this.loadAnimalCardImages(viewModels);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Unable to complete search. Please try again.');
        }
      });
  }

  /**
   * CASE 2: When categoryId exists in URL, load ALL animals belonging to this category
   * and all of its descendants: GET /api/Taxonomy/{categoryId}/animals
   */
  loadAnimalsForCategory(categoryId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.hasMoreAnimals.set(false);

    this.taxonomyService.getAnimalsByCategory(categoryId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Animal[]) => {
        const viewModels = this.createViewModels(data || []);
        this.animals.set(viewModels);
        this.isLoading.set(false);
        this.loadAnimalCardImages(viewModels);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load animals for this category. Please try again.');
      }
    });

    this.taxonomyService.getTaxonomyTree().pipe(takeUntil(this.destroy$)).subscribe({
      next: (tree: TaxonomyNode[]) => {
        const lookup = this.taxonomyService.findNodeAndPath(tree || [], categoryId);
        if (lookup) {
          this.selectedTaxonomyNode.set(lookup.node);
          this.selectedTaxonomyPath.set(lookup.path);
        }
      }
    });
  }

  /**
   * CASE 1: No categoryId exists in URL, load normal paginated catalog:
   * GET /api/Animal?page=1&pageSize=24
   */
  loadAnimals(): void {
    this.isSearching.set(false);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.currentPage.set(1);
    this.hasMoreAnimals.set(true);

    this.animalService.getAnimals(this.currentPage(), this.pageSize).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Animal[]) => {
        const viewModels = this.createViewModels(data || []);
        this.animals.set(viewModels);
        this.isLoading.set(false);
        this.loadAnimalCardImages(viewModels);

        if (!data || data.length < this.pageSize) {
          this.hasMoreAnimals.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load animals. Please try again.');
      }
    });
  }

  /**
   * Load next page of animals (supports both normal catalog pagination and backend search pagination)
   */
  loadMore(): void {
    if (this.isLoadingMore() || !this.hasMoreAnimals()) {
      return;
    }

    this.isLoadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    if (this.isSearching()) {
      const animal = this.animalSearchQuery().trim();
      const categoryId = this.selectedTaxonomyCategoryId() || undefined;

      this.animalService
        .searchAnimals(animal, undefined, categoryId, nextPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: Animal[]) => {
            const viewModels = this.createViewModels(data || []);
            this.animals.update(current => [...current, ...viewModels]);
            this.currentPage.set(nextPage);
            this.isLoadingMore.set(false);

            if (!data || data.length < this.pageSize) {
              this.hasMoreAnimals.set(false);
            }

            this.loadAnimalCardImages(viewModels);
          },
          error: () => {
            this.isLoadingMore.set(false);
            this.errorMessage.set('Unable to load more search results. Please try again.');
          }
        });
    } else {
      this.animalService.getAnimals(nextPage, this.pageSize).pipe(takeUntil(this.destroy$)).subscribe({
        next: (data: Animal[]) => {
          const viewModels = this.createViewModels(data || []);
          this.animals.update(current => [...current, ...viewModels]);
          this.currentPage.set(nextPage);
          this.isLoadingMore.set(false);

          if (!data || data.length < this.pageSize) {
            this.hasMoreAnimals.set(false);
          }

          this.loadAnimalCardImages(viewModels);
        },
        error: () => {
          this.isLoadingMore.set(false);
          this.errorMessage.set('Unable to load more animals. Please try again.');
        }
      });
    }
  }

  private createViewModels(data: Animal[]): AnimalCardVM[] {
    return data.map(item => ({
      ...item,
      firstImageUrl: item.firstImageUrl || null,
      imageLoaded: !!item.firstImageUrl,
      imageLoading: !item.firstImageUrl
    }));
  }

  private loadAnimalCardImages(animalList: AnimalCardVM[]): void {
    animalList.forEach(animal => {
      this.animalService.getAnimalImages(animal.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (images: AnimalImage[]) => {
          const firstImage = images && images.length > 0 ? images[0].imageUrl : null;
          this.animals.update(currentList =>
            currentList.map(item => {
              if (item.id === animal.id) {
                return {
                  ...item,
                  firstImageUrl: firstImage,
                  imageLoading: false,
                  imageLoaded: !!firstImage
                };
              }
              return item;
            })
          );
        },
        error: () => {
          this.animals.update(currentList =>
            currentList.map(item => {
              if (item.id === animal.id) {
                return {
                  ...item,
                  firstImageUrl: null,
                  imageLoading: false,
                  imageLoaded: false
                };
              }
              return item;
            })
          );
        }
      });
    });
  }

  navigateToDetails(animalId: number): void {
    this.router.navigate(['/animals', animalId]);
  }

  toggleFavorite(event: Event, animalId: number): void {
    event.stopPropagation();
    if (!this.authService.isAuthenticated()) {
      const returnUrl = this.router.url;
      this.toastService.show('Please log in to add animals to your favorites.', 'warning');
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: returnUrl && returnUrl !== '/login' ? returnUrl : '/animals',
          message: 'Please log in to add animals to your favorites.'
        }
      });
      return;
    }
    this.favoriteService.toggleFavorite(animalId).subscribe();
  }

  isFavorite(animalId: number): boolean {
    return this.favoriteService.isFavorite(animalId);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  clearAnimalSearch(): void {
    this.animalSearchQuery.set('');
    this.searchSubject$.next('');
  }

  clearSearch(): void {
    this.animalSearchQuery.set('');
    this.searchSubject$.next('');
  }

  clearAllFilters(): void {
    this.animalSearchQuery.set('');
    this.selectedCategory.set('all');
    this.searchSubject$.next('');
  }

  /**
   * Clear the active taxonomy category filter and remove categoryId from URL
   */
  clearTaxonomyFilter(): void {
    this.selectedTaxonomyCategoryId.set(null);
    this.selectedTaxonomyNode.set(null);
    this.selectedTaxonomyPath.set([]);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoryId: null },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Badge style classes based on taxonomic rank
   */
  getRankBadgeClass(rank: string | null | undefined): string {
    if (!rank) return 'rank-default';
    const normalized = rank.toUpperCase().trim();
    switch (normalized) {
      case 'KINGDOM':
        return 'rank-kingdom';
      case 'PHYLUM':
      case 'SUBPHYLUM':
        return 'rank-phylum';
      case 'CLASS':
      case 'SUPERCLASS':
      case 'SUBCLASS':
        return 'rank-class';
      case 'ORDER':
      case 'SUPERORDER':
      case 'SUBORDER':
        return 'rank-order';
      case 'FAMILY':
      case 'SUPERFAMILY':
      case 'SUBFAMILY':
        return 'rank-family';
      case 'GENUS':
      case 'SUBGENUS':
        return 'rank-genus';
      case 'SPECIES':
      case 'SUBSPECIES':
        return 'rank-species';
      default:
        return 'rank-default';
    }
  }
}
