import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { NavbarComponent } from './navbar.component';
import { AuthService, User } from '../../core/services/auth.service';

describe('NavbarComponent', () => {
  let mockAuthService: {
    isAuthenticated$: BehaviorSubject<boolean>;
    currentUser$: BehaviorSubject<User | null>;
    logout: jasmine.Spy;
  };

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated$: new BehaviorSubject<boolean>(true),
      currentUser$: new BehaviorSubject<User | null>({
        email: 'admin@mohra.com',
        fullName: 'Admin User',
        roles: ['Admin']
      }),
      logout: jasmine.createSpy('logout')
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();
  });

  it('should create the navbar component', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should toggle user dropdown on click', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isUserDropdownOpen()).toBeFalse();
    component.toggleUserDropdown();
    expect(component.isUserDropdownOpen()).toBeTrue();
    component.toggleUserDropdown();
    expect(component.isUserDropdownOpen()).toBeFalse();
  });

  it('should detect admin user correctly', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isAdmin()).toBeTrue();
  });

  it('should call logout and close dropdown when onLogout is invoked', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    component.isUserDropdownOpen.set(true);

    component.onLogout();
    expect(component.isUserDropdownOpen()).toBeFalse();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});

