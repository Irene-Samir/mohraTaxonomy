import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { AnimalService } from '../../core/services/animal.service';
import { CategoryService } from '../../core/services/category.service';
import { TaxonomyService } from '../../core/services/taxonomy.service';
import { AdminService } from '../../core/services/admin.service';

describe('AdminDashboardComponent', () => {
  let mockAuthService: Partial<AuthService>;
  let mockAnimalService: Partial<AnimalService>;
  let mockCategoryService: Partial<CategoryService>;
  let mockTaxonomyService: Partial<TaxonomyService>;
  let mockAdminService: Partial<AdminService>;

  beforeEach(async () => {
    mockAuthService = {
      isAdmin: () => true,
      getUsersCount: () => of(15),
      getUsers: () => of([
        { id: '1', email: 'admin@mohra.com', fullName: 'Admin User', roles: ['Admin'] }
      ])
    };

    mockAnimalService = {
      getAnimalsCount: () => of(120),
      getAnimals: () => of([
        {
          id: 1,
          name: 'Tiger',
          scientificName: 'Panthera tigris',
          description: 'Large feline',
          habitat: 'Jungle',
          diet: 'Carnivore',
          categoryId: 10,
          categoryName: 'Mammalia'
        }
      ]),
      createAnimal: () => of({
        id: 2,
        name: 'Lion',
        scientificName: 'Panthera leo',
        description: 'King of jungle',
        habitat: 'Savannah',
        diet: 'Carnivore',
        categoryId: 10,
        categoryName: 'Mammalia'
      }),
      updateAnimal: () => of({
        id: 1,
        name: 'Tiger Updated',
        scientificName: 'Panthera tigris',
        description: 'Large feline',
        habitat: 'Jungle',
        diet: 'Carnivore',
        categoryId: 10,
        categoryName: 'Mammalia'
      }),
      deleteAnimal: () => of(true)
    };

    mockCategoryService = {
      getCategories: () => of([
        { id: 10, name: 'Mammalia', rank: 'CLASS', parentId: null }
      ]),
      createCategory: () => of({ id: 11, name: 'Carnivora', rank: 'ORDER', parentId: 10 }),
      updateCategory: () => of({ id: 10, name: 'Mammalia Updated', rank: 'CLASS', parentId: null }),
      deleteCategory: () => of(true)
    };

    mockTaxonomyService = {
      getTaxonomyTree: () => of([
        { id: 1002, name: 'Animalia', rank: 'KINGDOM', children: [] }
      ]),
      flattenTreeWithPaths: () => [
        { node: { id: 1002, name: 'Animalia', rank: 'KINGDOM', children: [] }, path: [] }
      ]
    };

    mockAdminService = {
      getGbifAnimals: () => of([]),
      importGbifData: () => of('GBIF import success'),
      importGbifImages: () => of('GBIF images import success'),
      importAnimalImages: () => of('Animal images import success'),
      importAllAnimalImages: () => of('All animal images import success')
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: AnimalService, useValue: mockAnimalService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: TaxonomyService, useValue: mockTaxonomyService },
        { provide: AdminService, useValue: mockAdminService }
      ]
    }).compileComponents();
  });

  it('should create the admin dashboard component', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load statistics on initialization', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.totalUsersCount()).toBe(15);
    expect(component.totalAnimalsCount()).toBe(120);
    expect(component.totalCategoriesCount()).toBe(1);
    expect(component.animals().length).toBe(1);
  });

  it('should switch tabs', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.setTab('animals');
    expect(component.activeTab()).toBe('animals');

    component.setTab('gbif');
    expect(component.activeTab()).toBe('gbif');
  });
});

