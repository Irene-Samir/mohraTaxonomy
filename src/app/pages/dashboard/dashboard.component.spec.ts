import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { ChatService } from '../../core/services/chat.service';
import { AnimalService } from '../../core/services/animal.service';
import { TaxonomyService } from '../../core/services/taxonomy.service';

describe('DashboardComponent', () => {
  let mockAuthService: Partial<AuthService>;
  let mockFavoriteService: Partial<FavoriteService>;
  let mockChatService: Partial<ChatService>;
  let mockAnimalService: Partial<AnimalService>;
  let mockTaxonomyService: Partial<TaxonomyService>;

  beforeEach(async () => {
    mockAuthService = {
      currentUser$: of({
        id: 'user-1',
        fullName: 'Ereny Test',
        email: 'ereny@example.com',
        university: 'Cairo University',
        faculty: 'Faculty of Science'
      }),
      getCurrentUser: () => ({
        id: 'user-1',
        fullName: 'Ereny Test',
        email: 'ereny@example.com',
        university: 'Cairo University',
        faculty: 'Faculty of Science'
      })
    };

    mockFavoriteService = {
      getFavoriteAnimals: () => of([
        { id: 1, animalId: 1006, animalName: 'Hexarthra fennica', createdAt: '2026-08-30' }
      ]),
      getFavoriteCategories: () => of([
        { id: 1, categoryId: 1002, categoryName: 'Animalia', createdAt: '2026-08-30' }
      ]),
      removeFavoriteAnimal: () => of(true),
      removeFavoriteCategory: () => of(true)
    };

    mockChatService = {
      getSessions: () => of([
        { id: 10, title: 'Rotifera Research Chat', createdAt: '2026-08-30' }
      ]),
      deleteSession: () => of(true)
    };

    mockAnimalService = {
      getAnimalImages: () => of([
        { id: 91, imageUrl: 'https://example.com/animal.jpg', type: null, description: 'Test' }
      ])
    };

    mockTaxonomyService = {
      getTaxonomyTree: () => of([
        { id: 1002, name: 'Animalia', rank: 'KINGDOM', children: [] }
      ]),
      findNodeAndPath: () => ({
        node: { id: 1002, name: 'Animalia', rank: 'KINGDOM', children: [] },
        path: [{ id: 1002, name: 'Animalia', rank: 'KINGDOM', children: [] }]
      })
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: FavoriteService, useValue: mockFavoriteService },
        { provide: ChatService, useValue: mockChatService },
        { provide: AnimalService, useValue: mockAnimalService },
        { provide: TaxonomyService, useValue: mockTaxonomyService }
      ]
    }).compileComponents();
  });

  it('should create the dashboard component', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load user data and display statistics', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.currentUser()?.fullName).toBe('Ereny Test');
    expect(component.currentUser()?.university).toBe('Cairo University');
    expect(component.stats().animalsCount).toBe(1);
    expect(component.stats().categoriesCount).toBe(1);
    expect(component.stats().chatsCount).toBe(1);
  });

  it('should update active section when scrollToSection is called', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.activeSection()).toBe('overview');
    component.scrollToSection('favorite-animals-section', 'animals');
    expect(component.activeSection()).toBe('animals');

    component.scrollToSection('favorite-categories-section', 'categories');
    expect(component.activeSection()).toBe('categories');

    component.scrollToSection('ai-chats-section', 'chats');
    expect(component.activeSection()).toBe('chats');
  });
});

