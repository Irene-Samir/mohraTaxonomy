import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AnimalDetailsComponent } from './animal-details.component';
import { AnimalService, AnimalFullDetail } from '../../core/services/animal.service';
import { of } from 'rxjs';

describe('AnimalDetailsComponent', () => {
  let mockAnimalService: Partial<AnimalService>;

  beforeEach(async () => {
    mockAnimalService = {
      getAnimalFullDetails: (id: number) => of({
        id: 1006,
        gbifKey: 5219404,
        name: 'Hexarthra fennica',
        scientificName: 'Hexarthra fennica (Levander, 1892)',
        authorship: '(Levander, 1892)',
        description: 'Detailed description of specimen.',
        habitat: 'Marine, Coastal',
        diet: 'Planktivore',
        iucnCategory: 'LEAST_CONCERN',
        iucnCode: 'LC',
        isExtinct: false,
        isMarine: true,
        isFreshwater: false,
        isTerrestrial: false,
        livingPeriod: 'Recent',
        categoryId: 1007,
        categoryName: 'Hexarthra',
        taxonomyHierarchy: [
          { id: 1, name: 'Animalia', rank: 'KINGDOM' },
          { id: 2, name: 'Rotifera', rank: 'PHYLUM' }
        ],
        images: [
          {
            id: 91,
            imageUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/611672402/original.jpg',
            type: 'External',
            description: 'First image'
          },
          {
            id: 92,
            imageUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/623438245/original.jpg',
            type: 'SpeciesMedia',
            description: 'Second image'
          }
        ],
        commonNames: [
          { id: 1, name: 'Rotifer', language: 'eng', country: null, source: 'GBIF' }
        ],
        descriptions: [
          { id: 1, type: 'biology_ecology', description: 'Detailed biology', language: 'eng', source: 'GBIF' }
        ],
        distributions: [
          { id: 1, locality: 'Baltic Sea', country: 'FI', status: 'PRESENT', establishmentMeans: null, threatStatus: null, source: 'GBIF' }
        ],
        references: [
          { id: 1, citation: 'Levander (1892)', doi: '10.1000/182', source: 'GBIF' }
        ]
      })
    };

    await TestBed.configureTestingModule({
      imports: [AnimalDetailsComponent],
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

  it('should create the animal details component', () => {
    const fixture = TestBed.createComponent(AnimalDetailsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should set main image as images[0].imageUrl and populate full rich details', () => {
    const fixture = TestBed.createComponent(AnimalDetailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.animal()?.id).toBe(1006);
    expect(component.animal()?.gbifKey).toBe(5219404);
    expect(component.animal()?.authorship).toBe('(Levander, 1892)');
    expect(component.animal()?.taxonomyHierarchy.length).toBe(2);
    expect(component.images().length).toBe(2);
    expect(component.activeMainImageUrl()).toBe('https://inaturalist-open-data.s3.amazonaws.com/photos/611672402/original.jpg');
  });
});
