import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { FloatingAiButtonComponent } from './shared/floating-ai-button/floating-ai-button.component';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, FloatingAiButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Mohra Taxonomy';
  readonly toastService = inject(ToastService);
}
