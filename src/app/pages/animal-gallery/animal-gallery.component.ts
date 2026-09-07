import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnimalService, Animal, AnimalImage } from '../../core/services/animal.service';

@Component({
  selector: 'app-animal-gallery',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './animal-gallery.component.html',
  styleUrl: './animal-gallery.component.css'
})
export class AnimalGalleryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly animalService = inject(AnimalService);

  animalId = signal<number | null>(null);
  animal = signal<Animal | null>(null);
  images = signal<AnimalImage[]>([]);

  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  // Lightbox Modal State
  selectedImageIndex = signal<number | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!isNaN(id)) {
          this.animalId.set(id);
          this.loadGallery(id);
        } else {
          this.errorMessage.set('Invalid animal identifier.');
          this.isLoading.set(false);
        }
      }
    });
  }

  loadGallery(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Fetch animal details for heading context
    this.animalService.getAnimalById(id).subscribe({
      next: (data) => this.animal.set(data),
      error: () => {}
    });

    // Fetch ALL images for this animal
    this.animalService.getAnimalImages(id).subscribe({
      next: (imgs) => {
        this.images.set(imgs || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load animal images. Please try again.');
      }
    });
  }

  openLightbox(index: number): void {
    this.selectedImageIndex.set(index);
  }

  closeLightbox(): void {
    this.selectedImageIndex.set(null);
  }

  nextImage(event?: Event): void {
    if (event) event.stopPropagation();
    const current = this.selectedImageIndex();
    if (current !== null) {
      const total = this.images().length;
      this.selectedImageIndex.set((current + 1) % total);
    }
  }

  prevImage(event?: Event): void {
    if (event) event.stopPropagation();
    const current = this.selectedImageIndex();
    if (current !== null) {
      const total = this.images().length;
      this.selectedImageIndex.set((current - 1 + total) % total);
    }
  }
}

