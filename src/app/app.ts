import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { FloatingAiButtonComponent } from './shared/floating-ai-button/floating-ai-button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, FloatingAiButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Mohra Taxonomy';
}
