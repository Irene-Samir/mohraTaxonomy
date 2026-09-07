import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Custom validator to check that newPassword and confirmPassword match */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (password && confirmPassword && password !== confirmPassword) {
    control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else if (control.get('confirmPassword')?.hasError('passwordMismatch')) {
    control.get('confirmPassword')?.setErrors(null);
  }
  return null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  token = signal<string | null>(null);
  email = signal<string | null>(null);

  resetForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  ngOnInit(): void {
    const rawToken = this.route.snapshot.queryParamMap.get('token');
    const rawEmail = this.route.snapshot.queryParamMap.get('email');

    if (rawToken) {
      this.token.set(rawToken);
    }
    if (rawEmail) {
      this.email.set(rawEmail);
    }

    if (!rawToken) {
      this.errorMessage.set('Invalid or missing password reset token. Please request a new link from the sign-in page.');
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  isFieldInvalid(fieldName: 'newPassword' | 'confirmPassword'): boolean {
    const field = this.resetForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getPasswordStrength(): { level: 'weak' | 'medium' | 'strong' | 'none'; score: number; label: string } {
    const password = this.resetForm.get('newPassword')?.value || '';
    if (!password) {
      return { level: 'none', score: 0, label: '' };
    }

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      return { level: 'weak', score: 33, label: 'Weak' };
    } else if (score <= 3) {
      return { level: 'medium', score: 66, label: 'Medium' };
    } else {
      return { level: 'strong', score: 100, label: 'Strong' };
    }
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { newPassword, confirmPassword } = this.resetForm.value;

    this.authService.resetPassword({
      email: this.email() || undefined,
      token: this.token()!,
      newPassword: newPassword!,
      confirmPassword: confirmPassword!
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(
          res.message || 'Your password has been successfully reset! Redirecting to sign in...'
        );
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2200);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.message || 'Failed to reset password. The link may have expired or been used already.'
        );
      }
    });
  }
}

