import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface TeamMember {
  name: string;
  role: string;
  image: string;
}

interface DataSource {
  name: string;
  description: string;
  url: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {
  team: TeamMember[] = [
    {
      name: 'Ereny Samir',
      role: 'Full-Stack Developer',
      image: 'assets/images/about/ereny.png'
    },
    {
      name: 'Mhraeil Samir',
      role: 'Research & Project Idea',
      image: 'assets/images/about/mhraeil.jpg'
    }
  ];

  dataSources: DataSource[] = [
    {
      name: 'GBIF — Global Biodiversity Information Facility',
      description: 'Global open-access biodiversity data network providing scientific taxonomic records.',
      url: 'https://www.gbif.org/'
    },
    {
      name: 'Wikimedia Commons',
      description: 'Open-access media repository providing verified wildlife imagery and species media.',
      url: 'https://commons.wikimedia.org/'
    }
  ];

  technologies: string[] = [
    'Angular',
    'TypeScript',
    'HTML',
    'CSS',
    'ASP.NET Core Web API',
    'C#',
    'Entity Framework Core',
    'SQL Server',
    'JWT Authentication',
    'GBIF API'
  ];
}
