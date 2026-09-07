import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { CategoriesComponent } from './categories.component';
import { TaxonomyService, TaxonomyNode } from '../../core/services/taxonomy.service';

describe('CategoriesComponent', () => {
  let component: CategoriesComponent;
  let fixture: ComponentFixture<CategoriesComponent>;
  let taxonomyService: TaxonomyService;
  let router: Router;

  const mockTaxonomy: TaxonomyNode[] = [
    {
      id: 1002,
      name: 'Animalia',
      rank: 'KINGDOM',
      children: [
        {
          id: 1008,
          name: 'Chordata',
          rank: 'PHYLUM',
          children: [
            {
              id: 1009,
              name: 'Perciformes',
              rank: 'ORDER',
              children: [
                {
                  id: 1010,
                  name: 'Lutjanidae',
                  rank: 'FAMILY',
                  children: [
                    {
                      id: 1011,
                      name: 'Aprion',
                      rank: 'GENUS',
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    taxonomyService = TestBed.inject(TaxonomyService);
    router = TestBed.inject(Router);
    vi.spyOn(taxonomyService, 'getTaxonomyTree').mockReturnValue(of(mockTaxonomy));

    fixture = TestBed.createComponent(CategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create categories component', () => {
    expect(component).toBeTruthy();
  });

  it('should load taxonomy tree on init', () => {
    expect(component.taxonomyTree().length).toBe(1);
    expect(component.taxonomyTree()[0].name).toBe('Animalia');
    expect(component.isLoadingTree()).toBe(false);
  });

  it('should navigate to /animals with categoryId on viewAnimals', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const targetNode: TaxonomyNode = {
      id: 1011,
      name: 'Aprion',
      rank: 'GENUS',
      children: []
    };

    component.viewAnimals(targetNode);
    expect(navigateSpy).toHaveBeenCalledWith(['/animals'], {
      queryParams: { categoryId: 1011 }
    });
  });

  it('should filter taxonomy categories by search term', () => {
    component.searchQuery.set('Cho');
    expect(component.searchResults().length).toBe(1);
    expect(component.searchResults()[0].node.name).toBe('Chordata');
    expect(component.searchResults()[0].pathDisplay).toContain('Animalia → Chordata');

    component.searchQuery.set('NonExistent');
    expect(component.searchResults().length).toBe(0);
  });

  it('should toggle node expand and collapse in tree', () => {
    const rootNode = component.taxonomyTree()[0];
    expect(component.hasChildren(rootNode)).toBe(true);

    component.collapseAll();
    expect(component.isExpanded(rootNode.id)).toBe(false);

    component.toggleNodeExpand(rootNode);
    expect(component.isExpanded(rootNode.id)).toBe(true);

    component.toggleNodeExpand(rootNode);
    expect(component.isExpanded(rootNode.id)).toBe(false);
  });

  it('should support expandAll and collapseAll', () => {
    component.collapseAll();
    expect(component.expandedNodeIds().size).toBe(0);

    component.expandAll();
    expect(component.expandedNodeIds().size).toBeGreaterThan(0);
  });
});
