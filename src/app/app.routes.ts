import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { AnimalsComponent } from './pages/animals/animals.component';
import { AnimalDetailsComponent } from './pages/animal-details/animal-details.component';
import { AnimalGalleryComponent } from './pages/animal-gallery/animal-gallery.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AiChatComponent } from './pages/ai-chat/ai-chat.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { AboutComponent } from './pages/about/about.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Mohra Taxonomy – Discover & Explore the Animal Kingdom'
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
    title: 'Admin Dashboard – Mohra Taxonomy'
  },
  {
    path: 'admin/dashboard',
    redirectTo: 'admin'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    title: 'User Dashboard – Mohra Taxonomy'
  },
  {
    path: 'ai-chat',
    component: AiChatComponent,
    canActivate: [authGuard],
    title: 'AI Research Assistant – Mohra Taxonomy'
  },
  {
    path: 'chat',
    redirectTo: 'ai-chat'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Sign In – Mohra Taxonomy'
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    title: 'Reset Password – Mohra Taxonomy'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Create Account – Mohra Taxonomy'
  },
  {
    path: 'animals',
    component: AnimalsComponent,
    title: 'Animals Catalog – Mohra Taxonomy'
  },
  {
    path: 'animals/:id',
    component: AnimalDetailsComponent,
    title: 'Animal Details – Mohra Taxonomy'
  },
  {
    path: 'animals/:id/gallery',
    component: AnimalGalleryComponent,
    title: 'Image Gallery – Mohra Taxonomy'
  },
  {
    path: 'categories',
    component: CategoriesComponent,
    title: 'Taxonomy Categories – Mohra Taxonomy'
  },
  {
    path: 'taxonomy',
    component: CategoriesComponent,
    title: 'Taxonomy Hierarchy – Mohra Taxonomy'
  },
  {
    path: 'about',
    component: AboutComponent,
    title: 'About Mohra Taxonomy – Educational Biodiversity Platform'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
