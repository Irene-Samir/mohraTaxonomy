import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();
  });

  it('should create the register component', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have all 6 exact form fields initialized', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    const controls = component.registerForm.controls;
    
    expect(controls.fullName).toBeDefined();
    expect(controls.email).toBeDefined();
    expect(controls.university).toBeDefined();
    expect(controls.faculty).toBeDefined();
    expect(controls.password).toBeDefined();
    expect(controls.confirmPassword).toBeDefined();
  });

  it('should validate that password and confirmPassword match', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    
    component.registerForm.patchValue({
      fullName: 'Test User',
      email: 'test@example.com',
      university: 'Science University',
      faculty: 'Faculty of Zoology',
      password: 'Password123',
      confirmPassword: 'DifferentPassword'
    });

    component.registerForm.updateValueAndValidity();
    expect(component.registerForm.hasError('passwordMismatch')).toBe(true);

    component.registerForm.patchValue({
      confirmPassword: 'Password123'
    });
    component.registerForm.updateValueAndValidity();
    expect(component.registerForm.hasError('passwordMismatch')).toBe(false);
  });
});

