import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnimalService, AnimalFullDetail, AnimalImage, AnimalDescription } from '../../core/services/animal.service';
import { FavoriteService } from '../../core/services/favorite.service';

@Component({
  selector: 'app-animal-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './animal-details.component.html',
  styleUrl: './animal-details.component.css'
})
export class AnimalDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly animalService = inject(AnimalService);
  private readonly favoriteService = inject(FavoriteService);

  animalId = signal<number | null>(null);
  animal = signal<AnimalFullDetail | null>(null);
  activeMainImageUrl = signal<string | null>(null);
  activeImageIndex = signal<number>(0);

  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  // Interactive UI states
  isLightboxOpen = signal<boolean>(false);
  isDescriptionExpanded = signal<boolean>(false);
  isCommonNamesExpanded = signal<boolean>(false);
  activeDescriptionTab = signal<string>('all');

  // Descriptions grouped by category/type
  descriptionCategories = computed(() => {
    const a = this.animal();
    if (!a || !a.descriptions || a.descriptions.length === 0) {
      return [];
    }
    const types = new Set<string>();
    a.descriptions.forEach(d => {
      if (d.type) types.add(d.type);
    });
    return Array.from(types);
  });

  // Filtered descriptions based on active tab
  filteredDescriptions = computed(() => {
    const a = this.animal();
    if (!a || !a.descriptions) return [];
    const tab = this.activeDescriptionTab();
    if (tab === 'all') {
      return a.descriptions;
    }
    return a.descriptions.filter(d => d.type === tab);
  });

  // Images list
  images = computed(() => {
    return this.animal()?.images || [];
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!isNaN(id)) {
          this.animalId.set(id);
          this.loadAnimalDetails(id);
        } else {
          this.errorMessage.set('Invalid animal identifier specified.');
          this.isLoading.set(false);
        }
      }
    });
  }

  loadAnimalDetails(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Call unified full-details endpoint: GET /api/Animal/{id}/full-details
    this.animalService.getAnimalFullDetails(id).subscribe({
      next: (data) => {
        this.animal.set(data);
        if (data.images && data.images.length > 0) {
          this.activeMainImageUrl.set(data.images[0].imageUrl);
          this.activeImageIndex.set(0);
        } else {
          this.activeMainImageUrl.set(null);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load this animal profile. Please check that the server is running.');
      }
    });
  }

  // Active Image & Gallery Navigation
  setActiveImage(imageUrl: string, index: number = 0): void {
    this.activeMainImageUrl.set(imageUrl);
    this.activeImageIndex.set(index);
  }

  openLightbox(index: number = 0): void {
    const imgs = this.images();
    if (imgs && imgs.length > 0) {
      this.activeImageIndex.set(index);
      this.activeMainImageUrl.set(imgs[index].imageUrl);
      this.isLightboxOpen.set(true);
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox(): void {
    this.isLightboxOpen.set(false);
    document.body.style.overflow = '';
  }

  nextImage(): void {
    const imgs = this.images();
    if (!imgs.length) return;
    const nextIdx = (this.activeImageIndex() + 1) % imgs.length;
    this.setActiveImage(imgs[nextIdx].imageUrl, nextIdx);
  }

  prevImage(): void {
    const imgs = this.images();
    if (!imgs.length) return;
    const prevIdx = (this.activeImageIndex() - 1 + imgs.length) % imgs.length;
    this.setActiveImage(imgs[prevIdx].imageUrl, prevIdx);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.isLightboxOpen()) {
      if (event.key === 'Escape') this.closeLightbox();
      if (event.key === 'ArrowRight') this.nextImage();
      if (event.key === 'ArrowLeft') this.prevImage();
    }
  }

  // Description Toggles
  toggleDescription(): void {
    this.isDescriptionExpanded.update(v => !v);
  }

  setDescriptionTab(tab: string): void {
    this.activeDescriptionTab.set(tab);
  }

  formatDescriptionType(type: string): string {
    if (!type) return 'General';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // Common Names Toggle
  toggleCommonNames(): void {
    this.isCommonNamesExpanded.update(v => !v);
  }

  // Favorites
  toggleFavorite(): void {
    const a = this.animal();
    if (a) {
      this.favoriteService.toggleFavorite(a.id).subscribe();
    }
  }

  isFavorite(): boolean {
    const a = this.animal();
    return a ? this.favoriteService.isFavorite(a.id) : false;
  }

  // IUCN Helpers
  getIucnClass(code?: string | null, category?: string | null): string {
    const normalized = (code || category || '').toUpperCase().trim();
    if (normalized.includes('EX') || normalized.includes('EXTINCT')) return 'iucn-ex';
    if (normalized.includes('EW')) return 'iucn-ew';
    if (normalized.includes('CR')) return 'iucn-cr';
    if (normalized.includes('EN')) return 'iucn-en';
    if (normalized.includes('VU') || normalized.includes('VULNERABLE')) return 'iucn-vu';
    if (normalized.includes('NT')) return 'iucn-nt';
    if (normalized.includes('LC') || normalized.includes('LEAST_CONCERN')) return 'iucn-lc';
    if (normalized.includes('DD')) return 'iucn-dd';
    return 'iucn-ne';
  }

  getIucnLabel(code?: string | null, category?: string | null): string {
    const cat = category ? category.replace(/_/g, ' ') : '';
    const cd = code ? ` (${code})` : '';
    if (cat && cd) {
      return `${cat}${cd}`.toUpperCase();
    }
    return (cat || code || 'Not Evaluated').toUpperCase();
  }

  formatDoiUrl(doi: string): string {
    if (!doi) return '#';
    if (doi.startsWith('http://') || doi.startsWith('https://')) {
      return doi;
    }
    return `https://doi.org/${doi.trim()}`;
  }

  retry(): void {
    const id = this.animalId();
    if (id) {
      this.loadAnimalDetails(id);
    }
  }
}
