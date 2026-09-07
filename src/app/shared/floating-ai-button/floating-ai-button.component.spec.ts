import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FloatingAiButtonComponent } from './floating-ai-button.component';

describe('FloatingAiButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingAiButtonComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the floating AI button', () => {
    const fixture = TestBed.createComponent(FloatingAiButtonComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have a link to /ai-chat', () => {
    const fixture = TestBed.createComponent(FloatingAiButtonComponent);
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('/ai-chat');
  });
});

