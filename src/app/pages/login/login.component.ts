import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);
  showPassword = signal(false);

  ngOnInit(): void {
    const msg = this.route.snapshot.queryParams['message'];
    if (msg) {
      this.infoMessage.set(msg);
    }
  }


  // Forgot Password Modal State
  showForgotModal = signal(false);
  isSendingResetLink = signal(false);
  forgotSuccessMsg = signal<string | null>(null);
  forgotErrorMsg = signal<string | null>(null);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  openForgotModal(): void {
    const currentEmail = this.loginForm.get('email')?.value || '';
    if (currentEmail) {
      this.forgotForm.patchValue({ email: currentEmail });
    }
    this.forgotSuccessMsg.set(null);
    this.forgotErrorMsg.set(null);
    this.showForgotModal.set(true);
  }

  closeForgotModal(): void {
    this.showForgotModal.set(false);
    this.forgotSuccessMsg.set(null);
    this.forgotErrorMsg.set(null);
  }

  sendResetLink(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const email = this.forgotForm.get('email')?.value?.trim();
    if (!email) return;

    this.isSendingResetLink.set(true);
    this.forgotErrorMsg.set(null);
    this.forgotSuccessMsg.set(null);

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isSendingResetLink.set(false);
        this.forgotSuccessMsg.set(
          res.message || 'If an account exists for this email, a password reset link has been sent. Please check your inbox.'
        );
      },
      error: (err) => {
        this.isSendingResetLink.set(false);
        this.forgotErrorMsg.set(
          err.message || 'Unable to process your request. Please try again later.'
        );
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  isFieldInvalid(fieldName: 'email' | 'password'): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Sign in successful! Redirecting to Dashboard...');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        setTimeout(() => {
          this.router.navigateByUrl(returnUrl);
        }, 800);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Unable to sign in. Please verify your credentials.');
      }
    });
  }
}
