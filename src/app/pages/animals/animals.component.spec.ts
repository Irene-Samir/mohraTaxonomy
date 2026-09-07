import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AnimalsComponent } from './animals.component';
import { AnimalService } from '../../core/services/animal.service';
import { TaxonomyService, TaxonomyNode } from '../../core/services/taxonomy.service';
import { of } from 'rxjs';

describe('AnimalsComponent', () => {
  let mockAnimalService: Partial<AnimalService>;
  let mockTaxonomyService: Partial<TaxonomyService>;

  const mockTaxonomyTree: TaxonomyNode[] = [
    {
      id: 1002,
      name: 'Animalia',
      rank: 'KINGDOM',
      children: [
        {
          id: 1003,
          name: 'Rotifera',
          rank: 'PHYLUM',
          children: [
            {
              id: 1007,
              name: 'Hexarthra',
              rank: 'GENUS',
              children: []
            }
          ]
        }
      ]
    }
  ];

  beforeEach(async () => {
    mockAnimalService = {
      getAnimals: () => of([
        {
          id: 1006,
          name: 'Hexarthra fennica',
          scientificName: 'Hexarthra fennica (Levander, 1892)',
          description: 'A planktonic rotifer',
          habitat: 'Brackish and saline waters',
          diet: 'Bacteria and microalgae',
          categoryId: 1007,
          categoryName: 'Hexarthra'
        },
        {
          id: 1001,
          name: 'Tiger',
          scientificName: 'Panthera tigris',
          description: 'Large cat',
          habitat: 'Forests',
          diet: 'Carnivore',
          categoryId: 2000,
          categoryName: 'Felidae'
        }
      ]),
      getAnimalImages: () => of([
        {
          id: 91,
          imageUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/611672402/original.jpg',
          type: null,
          description: 'External image'
        }
      ])
    };

    mockTaxonomyService = {
      getTaxonomyTree: () => of(mockTaxonomyTree),
      getAnimalsByCategory: (categoryId: number) => of([
        {
          id: 1006,
          name: 'Hexarthra fennica',
          scientificName: 'Hexarthra fennica (Levander, 1892)',
          description: 'A planktonic rotifer',
          habitat: 'Brackish and saline waters',
          diet: 'Bacteria and microalgae',
          categoryId: 1007,
          categoryName: 'Hexarthra'
        }
      ]),
      findNodeAndPath: (tree, id) => {
        if (id === 1003) {
          return {
            node: mockTaxonomyTree[0].children[0],
            path: [mockTaxonomyTree[0], mockTaxonomyTree[0].children[0]]
          };
        }
        return null;
      }
    };

    await TestBed.configureTestingModule({
      imports: [AnimalsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AnimalService, useValue: mockAnimalService },
        { provide: TaxonomyService, useValue: mockTaxonomyService }
      ]
    }).compileComponents();
  });

  it('should create the animals catalog component', () => {
    const fixture = TestBed.createComponent(AnimalsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load animals in regular mode and set firstImageUrl from images[0]', () => {
    const fixture = TestBed.createComponent(AnimalsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.animals().length).toBe(2);
    expect(component.animals()[0].id).toBe(1006);
    expect(component.animals()[0].firstImageUrl).toBe('https://inaturalist-open-data.s3.amazonaws.com/photos/611672402/original.jpg');
  });

  it('should load all category animals directly from backend when categoryId is selected', () => {
    const fixture = TestBed.createComponent(AnimalsComponent);
    const component = fixture.componentInstance;

    component.loadAnimalsForCategory(1003);

    expect(component.animals().length).toBe(1);
    expect(component.animals()[0].name).toBe('Hexarthra fennica');
    expect(component.hasMoreAnimals()).toBe(false);
    expect(component.selectedTaxonomyNode()?.name).toBe('Rotifera');
    expect(component.selectedTaxonomyPath().length).toBe(2);
  });
});
