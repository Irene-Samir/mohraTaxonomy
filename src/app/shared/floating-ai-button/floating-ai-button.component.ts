import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-floating-ai-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './floating-ai-button.component.html',
  styleUrl: './floating-ai-button.component.css'
})
export class FloatingAiButtonComponent {}

