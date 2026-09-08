import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { AuthService, User } from '../../core/services/auth.service';

describe('NavbarComponent', () => {
  let mockAuthService: {
    isAuthenticated$: BehaviorSubject<boolean>;
    currentUser$: BehaviorSubject<User | null>;
    logout: any;
  };

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated$: new BehaviorSubject<boolean>(true),
      currentUser$: new BehaviorSubject<User | null>({
        email: 'admin@mohra.com',
        fullName: 'Admin User',
        roles: ['Admin']
      }),
      logout: vi.fn()
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

    expect(component.isUserDropdownOpen()).toBe(false);
    component.toggleUserDropdown();
    expect(component.isUserDropdownOpen()).toBe(true);
    component.toggleUserDropdown();
    expect(component.isUserDropdownOpen()).toBe(false);
  });

  it('should detect admin user correctly', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isAdmin()).toBe(true);
  });

  it('should call logout and close dropdown when onLogout is invoked', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const component = fixture.componentInstance;
    component.isUserDropdownOpen.set(true);

    component.onLogout();
    expect(component.isUserDropdownOpen()).toBe(false);
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
