import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Custom validator to check that password and confirmPassword match */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly standardFaculties = [
    { value: 'Faculty of Science', label: 'Faculty of Science 🥇 (كلية العلوم)' },
    { value: 'Faculty of Veterinary Medicine', label: 'Faculty of Veterinary Medicine (كلية الطب البيطري)' },
    { value: 'Faculty of Agriculture', label: 'Faculty of Agriculture (كلية الزراعة)' },
    { value: 'Faculty of Education', label: 'Faculty of Education (كلية التربية)' },
    { value: 'Other', label: 'Other Faculty (أخرى - كتابة الكلية يدوياً)' }
  ];

  registerForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    university: ['', [Validators.required]],
    faculty: ['', [Validators.required]],
    customFaculty: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  onFacultyChange(): void {
    const faculty = this.registerForm.get('faculty')?.value;
    const customControl = this.registerForm.get('customFaculty');
    if (faculty === 'Other') {
      customControl?.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      customControl?.clearValidators();
      customControl?.setValue('');
    }
    customControl?.updateValueAndValidity();
  }

  isCustomFacultyVisible(): boolean {
    return this.registerForm.get('faculty')?.value === 'Other';
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Password strength calculation:
   * 0-1: Weak, 2-3: Medium, 4+: Strong
   */
  getPasswordStrength(): { level: 'weak' | 'medium' | 'strong' | 'none'; score: number; label: string } {
    const password = this.registerForm.get('password')?.value || '';
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
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { fullName, email, university, faculty, customFaculty, password, confirmPassword } = this.registerForm.value;

    const finalFaculty = faculty === 'Other' ? (customFaculty?.trim() || 'Other') : (faculty?.trim() || '');

    if (!finalFaculty) {
      this.errorMessage.set('Please select or specify your faculty.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.register(
      fullName!,
      email!,
      university!,
      finalFaculty,
      password!,
      confirmPassword!
    ).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('Account created successfully! Redirecting to sign in...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Registration failed. Please check your information.');
      }
    });
  }
}

