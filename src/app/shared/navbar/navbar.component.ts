import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly destroy$ = new Subject<void>();

  isMenuOpen = signal(false);
  isUserDropdownOpen = signal(false);
  isAuthenticated = signal(false);
  currentUser = signal<User | null>(null);
  searchQuery = '';

  isAdmin = computed(() => {
    const user = this.currentUser();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.toLowerCase() === 'admin');
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isUserDropdownOpen() && !this.elementRef.nativeElement.querySelector('.user-dropdown-container')?.contains(target)) {
      this.closeUserDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isUserDropdownOpen()) {
      this.closeUserDropdown();
    }
  }

  ngOnInit(): void {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        this.isAuthenticated.set(isAuth);
        if (!isAuth) {
          this.closeUserDropdown();
        }
      });

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser.set(user);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
    if (this.isMenuOpen()) {
      this.closeUserDropdown();
    }
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  toggleUserDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isUserDropdownOpen.update(v => !v);
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen.set(false);
  }

  onSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    if (this.searchQuery.trim()) {
      this.router.navigate(['/animals'], { queryParams: { q: this.searchQuery.trim() } });
      this.closeMenu();
      this.closeUserDropdown();
    }
  }

  onLogout(): void {
    this.closeUserDropdown();
    this.closeMenu();
    this.authService.logout();
  }
}
