import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AnimalGalleryComponent } from './animal-gallery.component';
import { AnimalService } from '../../core/services/animal.service';
import { of } from 'rxjs';

describe('AnimalGalleryComponent', () => {
  let mockAnimalService: Partial<AnimalService>;

  beforeEach(async () => {
    mockAnimalService = {
      getAnimalById: (id: number) => of({
        id: 1006,
        name: 'Hexarthra fennica',
        scientificName: 'Hexarthra fennica (Levander, 1892)',
        description: null,
        habitat: null,
        diet: null,
        categoryId: 1007,
        categoryName: 'Hexarthra'
      }),
      getAnimalImages: (animalId: number) => of([
        {
          id: 91,
          imageUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/611672402/original.jpg',
          type: null,
          description: 'First image'
        },
        {
          id: 92,
          imageUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/623438245/original.jpg',
          type: null,
          description: 'Second image'
        }
      ])
    };

    await TestBed.configureTestingModule({
      imports: [AnimalGalleryComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (key: string) => (key === 'id' ? '1006' : null)
            })
          }
        },
        { provide: AnimalService, useValue: mockAnimalService }
      ]
    }).compileComponents();
  });

  it('should create the animal gallery component', () => {
    const fixture = TestBed.createComponent(AnimalGalleryComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load all returned images', () => {
    const fixture = TestBed.createComponent(AnimalGalleryComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.images().length).toBe(2);
  });

  it('should open and close lightbox', () => {
    const fixture = TestBed.createComponent(AnimalGalleryComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.openLightbox(1);
    expect(component.selectedImageIndex()).toBe(1);

    component.closeLightbox();
    expect(component.selectedImageIndex()).toBeNull();
  });
});

