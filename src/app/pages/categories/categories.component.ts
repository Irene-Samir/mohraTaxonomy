import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaxonomyService, TaxonomyNode } from '../../core/services/taxonomy.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

export interface SearchTaxonResult {
  node: TaxonomyNode;
  path: TaxonomyNode[];
  pathDisplay: string;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // Taxonomy Tree state
  taxonomyTree = signal<TaxonomyNode[]>([]);
  isLoadingTree = signal<boolean>(true);
  treeErrorMessage = signal<string | null>(null);

  // Expanded nodes in tree
  expandedNodeIds = signal<Set<number>>(new Set<number>());

  // Category search state (searches taxonomy categories ONLY)
  searchQuery = signal<string>('');

  // Flattened tree for efficient search and path lookups
  flatTaxonomyWithPaths = computed(() => {
    const tree = this.taxonomyTree();
    return this.taxonomyService.flattenTreeWithPaths(tree);
  });

  // Filtered search results based on category name and rank prefix / matching
  searchResults = computed<SearchTaxonResult[]>(() => {
    const term = this.searchQuery().trim().toLowerCase();
    if (!term) {
      return [];
    }

    const flatList = this.flatTaxonomyWithPaths();
    const matches: SearchTaxonResult[] = [];

    for (const item of flatList) {
      const name = item.node.name?.toLowerCase() || '';
      const rank = item.node.rank?.toLowerCase() || '';

      // Case-insensitive character-by-character search on category name & rank
      if (name.includes(term) || rank.includes(term)) {
        matches.push({
          node: item.node,
          path: item.path,
          pathDisplay: item.path.map(p => p.name).join(' → ')
        });
      }
    }

    return matches;
  });

  // Computed statistics
  totalNodesCount = computed(() => {
    return this.flatTaxonomyWithPaths().length;
  });

  totalKingdomsCount = computed(() => {
    return this.taxonomyTree().length;
  });

  ngOnInit(): void {
    this.loadTaxonomyTree();
  }

  /**
   * Load the taxonomy tree from backend API
   */
  loadTaxonomyTree(forceRefresh: boolean = false): void {
    this.isLoadingTree.set(true);
    this.treeErrorMessage.set(null);

    this.taxonomyService.getTaxonomyTree(forceRefresh).subscribe({
      next: (data: TaxonomyNode[]) => {
        this.taxonomyTree.set(data || []);
        this.isLoadingTree.set(false);

        // Auto-expand root levels by default
        this.autoExpandInitialLevels(data || []);
      },
      error: (error: Error) => {
        this.isLoadingTree.set(false);
        this.treeErrorMessage.set(
          error?.message || 'Unable to load taxonomy tree. Please try again.'
        );
      }
    });
  }

  /**
   * Navigate to the Animals page filtered by this taxonomy category
   */
  viewAnimals(node: TaxonomyNode, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/animals'], {
      queryParams: { categoryId: node.id }
    });
  }

  /**
   * Check if category is marked as favorite
   */
  isCategoryFavorite(categoryId: number): boolean {
    return this.favoriteService.isCategoryFavorite(categoryId);
  }

  /**
   * Toggle category favorite state
   */
  toggleCategoryFavorite(node: TaxonomyNode, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.authService.isAuthenticated()) {
      const returnUrl = this.router.url;
      this.toastService.show('Please log in to add categories to your favorites.', 'warning');
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: returnUrl && returnUrl !== '/login' ? returnUrl : '/categories',
          message: 'Please log in to add categories to your favorites.'
        }
      });
      return;
    }
    this.favoriteService.toggleFavoriteCategory(node.id).subscribe();
  }

  /**
   * Toggle node expand/collapse state in the tree
   */
  toggleNodeExpand(node: TaxonomyNode, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.hasChildren(node)) {
      return;
    }

    const current = new Set(this.expandedNodeIds());
    if (current.has(node.id)) {
      current.delete(node.id);
    } else {
      current.add(node.id);
    }
    this.expandedNodeIds.set(current);
  }

  /**
   * Check if node is expanded in the tree
   */
  isExpanded(nodeId: number): boolean {
    return this.expandedNodeIds().has(nodeId);
  }

  /**
   * Check if a node has children
   */
  hasChildren(node: TaxonomyNode): boolean {
    return !!node.children && node.children.length > 0;
  }

  /**
   * Expand all nodes across the tree
   */
  expandAll(): void {
    const allIds = new Set<number>();
    const collectIds = (nodes: TaxonomyNode[]) => {
      for (const node of nodes) {
        if (this.hasChildren(node)) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(this.taxonomyTree());
    this.expandedNodeIds.set(allIds);
  }

  /**
   * Collapse all nodes
   */
  collapseAll(): void {
    this.expandedNodeIds.set(new Set<number>());
  }

  /**
   * Clear search input
   */
  clearSearch(): void {
    this.searchQuery.set('');
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

  /**
   * Icon representation for taxonomic ranks
   */
  getRankIcon(rank: string | null | undefined): string {
    if (!rank) return '🏷️';
    const normalized = rank.toUpperCase().trim();
    switch (normalized) {
      case 'KINGDOM':
        return '👑';
      case 'PHYLUM':
        return '🌿';
      case 'CLASS':
        return '🦁';
      case 'ORDER':
        return '🧬';
      case 'FAMILY':
        return '📁';
      case 'GENUS':
        return '🔬';
      case 'SPECIES':
        return '🐾';
      default:
        return '🏷️';
    }
  }

  /**
   * Initial auto-expansion of root and first sub-level
   */
  private autoExpandInitialLevels(nodes: TaxonomyNode[]): void {
    const idsToExpand = new Set<number>();
    for (const root of nodes) {
      if (this.hasChildren(root)) {
        idsToExpand.add(root.id);
        for (const child of root.children) {
          if (this.hasChildren(child)) {
            idsToExpand.add(child.id);
          }
        }
      }
    }
    this.expandedNodeIds.set(idsToExpand);
  }
}
