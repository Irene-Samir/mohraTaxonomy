import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { FavoriteService, FavoriteAnimal, FavoriteCategory } from '../../core/services/favorite.service';
import { ChatService, ChatSession } from '../../core/services/chat.service';
import { AnimalService, AnimalImage } from '../../core/services/animal.service';
import { TaxonomyService, TaxonomyNode } from '../../core/services/taxonomy.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly chatService = inject(ChatService);
  private readonly animalService = inject(AnimalService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly router = inject(Router);

  // User details
  currentUser = signal<User | null>(null);

  // Favorite Animals state
  favoriteAnimals = signal<FavoriteAnimal[]>([]);
  isLoadingAnimals = signal<boolean>(true);
  animalsError = signal<string | null>(null);

  // Favorite Categories state
  favoriteCategories = signal<FavoriteCategory[]>([]);
  isLoadingCategories = signal<boolean>(true);
  categoriesError = signal<string | null>(null);

  // AI Chat Sessions state
  chatSessions = signal<ChatSession[]>([]);
  isLoadingChats = signal<boolean>(true);
  chatsError = signal<string | null>(null);

  // Active section for sidebar navigation
  activeSection = signal<'overview' | 'animals' | 'categories' | 'chats'>('overview');

  // Computed statistics from real data
  stats = computed(() => ({
    animalsCount: this.favoriteAnimals().length,
    categoriesCount: this.favoriteCategories().length,
    chatsCount: this.chatSessions().length
  }));

  scrollToSection(sectionId: string, sectionKey: 'overview' | 'animals' | 'categories' | 'chats', event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.activeSection.set(sectionKey);
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  ngOnInit(): void {
    // 1. Subscribe to current user profile
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user || this.authService.getCurrentUser());
    });

    // 2. Fetch all dashboard data concurrently
    this.loadFavoriteAnimals();
    this.loadFavoriteCategories();
    this.loadChatSessions();
  }

  /**
   * Load favorite animals from backend
   */
  loadFavoriteAnimals(): void {
    this.isLoadingAnimals.set(true);
    this.animalsError.set(null);

    this.favoriteService.getFavoriteAnimals().subscribe({
      next: (data) => {
        const enriched: FavoriteAnimal[] = data.map(item => ({
          ...item,
          imageUrl: null,
          imageLoading: true
        }));
        this.favoriteAnimals.set(enriched);
        this.isLoadingAnimals.set(false);

        // Fetch official images for favorite animals
        this.loadFavoriteAnimalImages(enriched);
      },
      error: (err: Error) => {
        this.isLoadingAnimals.set(false);
        this.animalsError.set(err.message || 'Unable to load favorite animals.');
      }
    });
  }

  /**
   * Fetch image for each favorite animal
   */
  private loadFavoriteAnimalImages(animals: FavoriteAnimal[]): void {
    animals.forEach(fav => {
      this.animalService.getAnimalImages(fav.animalId).subscribe({
        next: (images: AnimalImage[]) => {
          const firstImage = images && images.length > 0 ? images[0].imageUrl : null;
          this.favoriteAnimals.update(current =>
            current.map(item =>
              item.id === fav.id
                ? { ...item, imageUrl: firstImage, imageLoading: false }
                : item
            )
          );
        },
        error: () => {
          this.favoriteAnimals.update(current =>
            current.map(item =>
              item.id === fav.id
                ? { ...item, imageUrl: null, imageLoading: false }
                : item
            )
          );
        }
      });
    });
  }

  /**
   * Load favorite categories from backend
   */
  loadFavoriteCategories(): void {
    this.isLoadingCategories.set(true);
    this.categoriesError.set(null);

    this.favoriteService.getFavoriteCategories().subscribe({
      next: (data) => {
        this.favoriteCategories.set(data);
        this.isLoadingCategories.set(false);

        // Enrich with rank from taxonomy tree if needed
        this.enrichCategoryRanks(data);
      },
      error: (err: Error) => {
        this.isLoadingCategories.set(false);
        this.categoriesError.set(err.message || 'Unable to load favorite categories.');
      }
    });
  }

  /**
   * Enrich category rank using cached taxonomy tree
   */
  private enrichCategoryRanks(categories: FavoriteCategory[]): void {
    this.taxonomyService.getTaxonomyTree().subscribe({
      next: (tree) => {
        this.favoriteCategories.update(current =>
          current.map(cat => {
            const lookup = this.taxonomyService.findNodeAndPath(tree || [], cat.categoryId);
            return {
              ...cat,
              rank: lookup ? lookup.node.rank : 'TAXON'
            };
          })
        );
      }
    });
  }

  /**
   * Load user's recent AI chat sessions from backend
   */
  loadChatSessions(): void {
    this.isLoadingChats.set(true);
    this.chatsError.set(null);

    this.chatService.getSessions().subscribe({
      next: (data) => {
        this.chatSessions.set(data || []);
        this.isLoadingChats.set(false);
      },
      error: (err: Error) => {
        this.isLoadingChats.set(false);
        this.chatsError.set(err.message || 'Unable to load AI conversations.');
      }
    });
  }

  /**
   * Remove animal from favorites
   */
  removeAnimal(animalId: number, event: Event): void {
    event.stopPropagation();
    this.favoriteService.removeFavoriteAnimal(animalId).subscribe({
      next: () => {
        this.favoriteAnimals.update(list => list.filter(a => a.animalId !== animalId));
      }
    });
  }

  /**
   * Remove category from favorites
   */
  removeCategory(categoryId: number, event: Event): void {
    event.stopPropagation();
    this.favoriteService.removeFavoriteCategory(categoryId).subscribe({
      next: () => {
        this.favoriteCategories.update(list => list.filter(c => c.categoryId !== categoryId));
      }
    });
  }

  /**
   * Delete a chat session
   */
  deleteChat(sessionId: number, event: Event): void {
    event.stopPropagation();
    this.chatService.deleteSession(sessionId).subscribe({
      next: () => {
        this.chatSessions.update(list => list.filter(s => s.id !== sessionId));
      }
    });
  }

  /**
   * Navigate to Animals page filtered by category
   */
  viewCategoryAnimals(categoryId: number): void {
    this.router.navigate(['/animals'], {
      queryParams: { categoryId }
    });
  }

  /**
   * Navigate to Animal Details
   */
  viewAnimalDetails(animalId: number): void {
    this.router.navigate(['/animals', animalId]);
  }

  /**
   * Open AI Chat session
   */
  openChatSession(sessionId: number): void {
    this.router.navigate(['/ai-chat'], {
      queryParams: { sessionId }
    });
  }

  /**
   * Start a new chat
   */
  startNewChat(): void {
    this.router.navigate(['/ai-chat']);
  }

  /**
   * Helper rank badge styles
   */
  getRankBadgeClass(rank: string | null | undefined): string {
    if (!rank) return 'rank-default';
    const normalized = rank.toUpperCase().trim();
    switch (normalized) {
      case 'KINGDOM': return 'rank-kingdom';
      case 'PHYLUM': return 'rank-phylum';
      case 'CLASS': return 'rank-class';
      case 'ORDER': return 'rank-order';
      case 'FAMILY': return 'rank-family';
      case 'GENUS': return 'rank-genus';
      default: return 'rank-default';
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }
}

