import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, User, FacultyStat } from '../../core/services/auth.service';
import { AnimalService, Animal, AnimalImage, CreateAnimalDto, UpdateAnimalDto } from '../../core/services/animal.service';
import { CategoryService, Category, CreateCategoryDto, UpdateCategoryDto } from '../../core/services/category.service';
import { TaxonomyService, TaxonomyNode } from '../../core/services/taxonomy.service';
import { AdminService, GbifBatchImportResult } from '../../core/services/admin.service';

type AdminTab = 'overview' | 'animals' | 'animal-images' | 'categories' | 'gbif' | 'images' | 'users';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly animalService = inject(AnimalService);
  private readonly categoryService = inject(CategoryService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  // Active section tab
  activeTab = signal<AdminTab>('overview');

  // Statistics
  totalUsersCount = signal<number>(0);
  totalAnimalsCount = signal<number>(0);
  totalCategoriesCount = signal<number>(0);
  isLoadingStats = signal<boolean>(true);

  // Faculty Distribution Statistics
  facultyStats = signal<FacultyStat[]>([]);
  isLoadingFacultyStats = signal<boolean>(false);
  selectedFacultySlice = signal<FacultyStat | null>(null);

  // Users List
  usersList = signal<User[]>([]);
  isLoadingUsers = signal<boolean>(false);

  // Animals Management
  animals = signal<Animal[]>([]);
  animalsPage = signal<number>(1);
  animalsPageSize = 20;
  totalAnimalsPages = computed(() => Math.ceil(this.totalAnimalsCount() / this.animalsPageSize) || 1);
  isLoadingAnimals = signal<boolean>(false);
  animalSearchQuery = signal<string>('');

  // Animal Modals & Forms
  showAnimalModal = signal<boolean>(false);
  isEditingAnimal = signal<boolean>(false);
  editingAnimalId = signal<number | null>(null);
  isSavingAnimal = signal<boolean>(false);

  animalForm = this.fb.group({
    name: ['', [Validators.required]],
    scientificName: [''],
    description: [''],
    habitat: [''],
    diet: [''],
    categoryId: [null as number | null, [Validators.required]]
  });

  // Delete Confirmations
  showDeleteModal = signal<boolean>(false);
  deleteItemType = signal<'animal' | 'category' | 'image' | null>(null);
  deleteItemId = signal<number | null>(null);
  deleteItemName = signal<string>('');
  isDeleting = signal<boolean>(false);

  // ================= ANIMAL IMAGES MANAGEMENT =================
  selectedAnimalForImages = signal<Animal | null>(null);
  animalImagesList = signal<AnimalImage[]>([]);
  isLoadingAnimalImages = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);
  uploadImageDescription = signal<string>('');
  selectedImageFile: File | null = null;

  // ================= CATEGORIES MANAGEMENT =================
  taxonomyTree = signal<TaxonomyNode[]>([]);
  flatCategories = signal<Category[]>([]);
  isLoadingCategories = signal<boolean>(false);
  categorySearchQuery = signal<string>('');
  expandedNodeIds = signal<Set<number>>(new Set<number>());

  // Category Modal & Form (with Optional Image support)
  showCategoryModal = signal<boolean>(false);
  isEditingCategory = signal<boolean>(false);
  editingCategoryId = signal<number | null>(null);
  isSavingCategory = signal<boolean>(false);
  selectedCategoryFile: File | null = null;
  categoryImagePreview = signal<string | null>(null);
  existingCategoryImageUrl = signal<string | null>(null);

  categoryForm = this.fb.group({
    name: ['', [Validators.required]],
    rank: ['SPECIES', [Validators.required]],
    parentId: [null as number | null],
    description: ['']
  });

  // GBIF Management
  gbifPreviewAnimals = signal<any[]>([]);
  isLoadingGbif = signal<boolean>(false);
  isImportingGbif = signal<boolean>(false);

  // GBIF Phylum Batch Import Parameters
  gbifPhylumKey = signal<number>(44);
  gbifBatchSize = signal<number>(1000);
  gbifOffset = signal<number>(0);
  lastBatchResult = signal<GbifBatchImportResult | null>(null);

  // GBIF Single Animal Import
  singleGbifKey = signal<number | null>(null);
  isImportingSingleGbif = signal<boolean>(false);
  lastSingleImportedAnimal = signal<any | null>(null);

  // Image Import Management
  isImportingGbifImages = signal<boolean>(false);
  isImportingAllImages = signal<boolean>(false);
  selectedAnimalForImageImport = signal<number | null>(null);
  isImportingSingleAnimalImage = signal<boolean>(false);

  // Global Notification & Status Message
  statusMessage = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Common taxonomic ranks for dropdown
  availableRanks = [
    'KINGDOM',
    'PHYLUM',
    'CLASS',
    'ORDER',
    'FAMILY',
    'GENUS',
    'SPECIES'
  ];

  filteredAnimalsList = computed(() => {
    const query = this.animalSearchQuery().trim().toLowerCase();
    const list = this.animals();
    if (!query) return list;
    return list.filter(a =>
      a.name?.toLowerCase().includes(query) ||
      a.scientificName?.toLowerCase().includes(query) ||
      a.categoryName?.toLowerCase().includes(query)
    );
  });

  filteredCategoriesList = computed(() => {
    const query = this.categorySearchQuery().trim().toLowerCase();
    const list = this.flatCategories();
    if (!query) return list;
    return list.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.rank?.toLowerCase().includes(query)
    );
  });

  // Computed SVG Donut Segments for Faculty Distribution
  donutSlices = computed(() => {
    const stats = this.facultyStats();
    if (!stats || stats.length === 0) return [];
    const circumference = 2 * Math.PI * 70; // ~439.82
    let accumulatedPercent = 0;

    return stats.map((stat, idx) => {
      const strokeDasharray = `${(stat.percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
      accumulatedPercent += stat.percentage;
      const color = this.getFacultyColor(stat.faculty, idx);

      return {
        ...stat,
        strokeDasharray,
        strokeDashoffset,
        color,
        icon: this.getFacultyIcon(stat.faculty)
      };
    });
  });

  getFacultyColor(name: string, index: number = 0): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('science')) return '#10B981'; // Emerald Green
    if (lower.includes('veterinary')) return '#3B82F6'; // Royal Blue
    if (lower.includes('agriculture')) return '#F59E0B'; // Amber Gold
    if (lower.includes('education')) return '#8B5CF6'; // Purple
    const palette = ['#EC4899', '#06B6D4', '#F43F5E', '#84CC16', '#64748B'];
    return palette[index % palette.length];
  }

  getFacultyIcon(name: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('science')) return '🔬';
    if (lower.includes('veterinary')) return '🩺';
    if (lower.includes('agriculture')) return '🌾';
    if (lower.includes('education')) return '📚';
    return '🏛️';
  }

  ngOnInit(): void {
    this.loadAllStatistics();
    this.loadFacultyStats();
    this.loadAnimals();
    this.loadCategories();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    this.statusMessage.set(null);

    if (tab === 'users') {
      if (this.usersList().length === 0) {
        this.loadUsers();
      }
      this.loadFacultyStats();
    } else if (tab === 'gbif' && this.gbifPreviewAnimals().length === 0) {
      this.loadGbifPreview();
    } else if (tab === 'animal-images' && !this.selectedAnimalForImages() && this.animals().length > 0) {
      this.selectAnimalForImageManagement(this.animals()[0]);
    }
  }

  // ================= STATISTICS =================

  loadAllStatistics(): void {
    this.isLoadingStats.set(true);

    // 1. Users count (from API)
    this.authService.getUsersCount().subscribe({
      next: (count) => this.totalUsersCount.set(count),
      error: () => this.totalUsersCount.set(0)
    });

    // 2. Faculty distribution stats
    this.loadFacultyStats();

    // 3. Animals count
    this.animalService.getAnimalsCount().subscribe({
      next: (count) => this.totalAnimalsCount.set(count),
      error: () => this.totalAnimalsCount.set(0)
    });

    // 4. Categories tree & count
    this.taxonomyService.getTaxonomyTree().subscribe({
      next: (tree) => {
        this.taxonomyTree.set(tree || []);
        // Auto-expand root nodes
        if (tree && tree.length > 0) {
          const rootIds = new Set<number>(tree.map(n => n.id));
          this.expandedNodeIds.set(rootIds);
        }
        const flat = this.taxonomyService.flattenTreeWithPaths(tree || []);
        this.totalCategoriesCount.set(flat.length);
        this.isLoadingStats.set(false);
      },
      error: () => {
        this.isLoadingStats.set(false);
      }
    });
  }

  // ================= USERS & FACULTY =================

  loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.usersList.set(users || []);
        this.totalUsersCount.set(users.length);
        this.isLoadingUsers.set(false);
        if (this.facultyStats().length === 0) {
          this.calculateFacultyStatsFromUsers();
        }
      },
      error: (err: Error) => {
        this.isLoadingUsers.set(false);
        this.showStatus('error', err.message || 'Unable to load registered users.');
      }
    });
  }

  loadFacultyStats(): void {
    this.isLoadingFacultyStats.set(true);
    this.authService.getFacultyStats().subscribe({
      next: (stats) => {
        this.facultyStats.set(stats || []);
        this.isLoadingFacultyStats.set(false);
      },
      error: () => {
        this.calculateFacultyStatsFromUsers();
        this.isLoadingFacultyStats.set(false);
      }
    });
  }

  calculateFacultyStatsFromUsers(): void {
    const users = this.usersList();
    if (!users || users.length === 0) return;
    const map = new Map<string, number>();
    for (const u of users) {
      const f = u.faculty?.trim() || 'Other / Unspecified';
      map.set(f, (map.get(f) || 0) + 1);
    }
    const total = users.length;
    const stats: FacultyStat[] = Array.from(map.entries()).map(([faculty, count]) => ({
      faculty,
      count,
      percentage: Math.round((count / total) * 1000) / 10
    })).sort((a, b) => b.count - a.count);
    this.facultyStats.set(stats);
  }

  // ================= ANIMALS CRUD =================

  loadAnimals(): void {
    this.isLoadingAnimals.set(true);
    this.animalService.getAnimals(this.animalsPage(), this.animalsPageSize).subscribe({
      next: (data) => {
        this.animals.set(data || []);
        this.isLoadingAnimals.set(false);
      },
      error: (err: Error) => {
        this.isLoadingAnimals.set(false);
        this.showStatus('error', err.message || 'Unable to load animals.');
      }
    });
  }

  goToAnimalsPage(page: number): void {
    if (page < 1 || page > this.totalAnimalsPages()) return;
    this.animalsPage.set(page);
    this.loadAnimals();
  }

  openAddAnimalModal(): void {
    this.isEditingAnimal.set(false);
    this.editingAnimalId.set(null);
    this.animalForm.reset({
      name: '',
      scientificName: '',
      description: '',
      habitat: '',
      diet: '',
      categoryId: this.flatCategories().length > 0 ? this.flatCategories()[0].id : null
    });
    this.showAnimalModal.set(true);
  }

  openEditAnimalModal(animal: Animal): void {
    this.isEditingAnimal.set(true);
    this.editingAnimalId.set(animal.id);
    this.animalForm.patchValue({
      name: animal.name,
      scientificName: animal.scientificName || '',
      description: animal.description || '',
      habitat: animal.habitat || '',
      diet: animal.diet || '',
      categoryId: animal.categoryId
    });
    this.showAnimalModal.set(true);
  }

  closeAnimalModal(): void {
    this.showAnimalModal.set(false);
    this.animalForm.reset();
  }

  saveAnimal(): void {
    if (this.animalForm.invalid) {
      this.animalForm.markAllAsTouched();
      return;
    }

    this.isSavingAnimal.set(true);
    const formVal = this.animalForm.value;

    const dto: CreateAnimalDto = {
      name: formVal.name!,
      scientificName: formVal.scientificName || null,
      description: formVal.description || null,
      habitat: formVal.habitat || null,
      diet: formVal.diet || null,
      categoryId: Number(formVal.categoryId!)
    };

    if (this.isEditingAnimal() && this.editingAnimalId()) {
      // Update
      this.animalService.updateAnimal(this.editingAnimalId()!, dto as UpdateAnimalDto).subscribe({
        next: () => {
          this.isSavingAnimal.set(false);
          this.closeAnimalModal();
          this.showStatus('success', `Animal "${dto.name}" updated successfully.`);
          this.loadAnimals();
        },
        error: (err: Error) => {
          this.isSavingAnimal.set(false);
          this.showStatus('error', err.message || 'Failed to update animal.');
        }
      });
    } else {
      // Create
      this.animalService.createAnimal(dto).subscribe({
        next: () => {
          this.isSavingAnimal.set(false);
          this.closeAnimalModal();
          this.showStatus('success', `Animal "${dto.name}" created successfully.`);
          this.loadAnimals();
          this.totalAnimalsCount.update(c => c + 1);
        },
        error: (err: Error) => {
          this.isSavingAnimal.set(false);
          this.showStatus('error', err.message || 'Failed to create animal.');
        }
      });
    }
  }

  confirmDeleteAnimal(animal: Animal): void {
    this.deleteItemType.set('animal');
    this.deleteItemId.set(animal.id);
    this.deleteItemName.set(animal.name);
    this.showDeleteModal.set(true);
  }

  // ================= ANIMAL IMAGES MANAGEMENT =================

  selectAnimalForImageManagement(animal: Animal): void {
    this.selectedAnimalForImages.set(animal);
    this.activeTab.set('animal-images');
    this.loadImagesForSelectedAnimal(animal.id);
  }

  onAnimalSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const animalId = Number(select.value);
    const animal = this.animals().find(a => a.id === animalId);
    if (animal) {
      this.selectedAnimalForImages.set(animal);
      this.loadImagesForSelectedAnimal(animal.id);
    }
  }

  loadImagesForSelectedAnimal(animalId: number): void {
    this.isLoadingAnimalImages.set(true);
    this.animalService.getAnimalImages(animalId).subscribe({
      next: (images) => {
        this.animalImagesList.set(images || []);
        this.isLoadingAnimalImages.set(false);
      },
      error: (err: Error) => {
        this.isLoadingAnimalImages.set(false);
        this.showStatus('error', err.message || 'Unable to load images for this animal.');
      }
    });
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImageFile = input.files[0];
    } else {
      this.selectedImageFile = null;
    }
  }

  uploadImageForAnimal(): void {
    const animal = this.selectedAnimalForImages();
    if (!animal || !this.selectedImageFile) return;

    this.isUploadingImage.set(true);
    this.animalService.uploadAnimalImage(
      animal.id,
      this.selectedImageFile,
      this.uploadImageDescription() || undefined
    ).subscribe({
      next: (newImg) => {
        this.isUploadingImage.set(false);
        this.selectedImageFile = null;
        this.uploadImageDescription.set('');
        this.showStatus('success', `Image uploaded successfully for "${animal.name}".`);
        this.loadImagesForSelectedAnimal(animal.id);
      },
      error: (err: Error) => {
        this.isUploadingImage.set(false);
        this.showStatus('error', err.message || 'Failed to upload image.');
      }
    });
  }

  confirmDeleteImage(image: AnimalImage): void {
    this.deleteItemType.set('image');
    this.deleteItemId.set(image.id);
    this.deleteItemName.set(image.description || `Image #${image.id}`);
    this.showDeleteModal.set(true);
  }

  // ================= CATEGORIES CRUD (WITH OPTIONAL IMAGE SUPPORT) =================

  loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.flatCategories.set(cats || []);
        this.isLoadingCategories.set(false);
      },
      error: (err: Error) => {
        this.isLoadingCategories.set(false);
        this.showStatus('error', err.message || 'Unable to load categories.');
      }
    });
  }

  toggleNode(nodeId: number): void {
    const next = new Set(this.expandedNodeIds());
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    this.expandedNodeIds.set(next);
  }

  isNodeExpanded(nodeId: number): boolean {
    return this.expandedNodeIds().has(nodeId);
  }

  onCategoryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.showStatus('error', 'Please select a valid image file (JPG, PNG, WebP).');
        input.value = '';
        return;
      }
      this.selectedCategoryFile = file;

      // Generate preview
      const reader = new FileReader();
      reader.onload = () => {
        this.categoryImagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      this.removeSelectedCategoryImage(input);
    }
  }

  removeSelectedCategoryImage(fileInput?: HTMLInputElement): void {
    this.selectedCategoryFile = null;
    this.categoryImagePreview.set(null);
    if (fileInput) {
      fileInput.value = '';
    }
  }

  openAddCategoryModal(parentId?: number | null): void {
    this.isEditingCategory.set(false);
    this.editingCategoryId.set(null);
    this.selectedCategoryFile = null;
    this.categoryImagePreview.set(null);
    this.existingCategoryImageUrl.set(null);
    this.categoryForm.reset({
      name: '',
      rank: 'SPECIES',
      parentId: parentId ?? null,
      description: ''
    });
    this.showCategoryModal.set(true);
  }

  openEditCategoryModal(cat: Category | TaxonomyNode): void {
    this.isEditingCategory.set(true);
    this.editingCategoryId.set(cat.id);
    this.selectedCategoryFile = null;
    this.categoryImagePreview.set(null);
    this.existingCategoryImageUrl.set((cat as Category).imageUrl || (cat as any).imageUrl || null);
    this.categoryForm.patchValue({
      name: cat.name,
      rank: cat.rank || 'SPECIES',
      parentId: (cat as any).parentId ?? null,
      description: (cat as any).description || ''
    });
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
    this.selectedCategoryFile = null;
    this.categoryImagePreview.set(null);
    this.existingCategoryImageUrl.set(null);
    this.categoryForm.reset();
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isSavingCategory.set(true);
    const formVal = this.categoryForm.value;

    const dto: CreateCategoryDto = {
      name: formVal.name!,
      rank: formVal.rank!,
      parentId: formVal.parentId ? Number(formVal.parentId) : null,
      description: formVal.description || null,
      image: this.selectedCategoryFile || null
    };

    if (this.isEditingCategory() && this.editingCategoryId()) {
      this.categoryService.updateCategory(this.editingCategoryId()!, dto as UpdateCategoryDto).subscribe({
        next: () => {
          this.isSavingCategory.set(false);
          this.closeCategoryModal();
          this.showStatus('success', `Category "${dto.name}" updated successfully.`);
          this.loadCategories();
          this.taxonomyService.getTaxonomyTree(true).subscribe(tree => {
            this.taxonomyTree.set(tree || []);
          });
        },
        error: (err: Error) => {
          this.isSavingCategory.set(false);
          this.showStatus('error', err.message || 'Failed to update category.');
        }
      });
    } else {
      this.categoryService.createCategory(dto).subscribe({
        next: () => {
          this.isSavingCategory.set(false);
          this.closeCategoryModal();
          this.showStatus('success', `Category "${dto.name}" created successfully.`);
          this.loadCategories();
          this.taxonomyService.getTaxonomyTree(true).subscribe(tree => {
            this.taxonomyTree.set(tree || []);
          });
          this.totalCategoriesCount.update(c => c + 1);
        },
        error: (err: Error) => {
          this.isSavingCategory.set(false);
          this.showStatus('error', err.message || 'Failed to create category.');
        }
      });
    }
  }

  confirmDeleteCategory(cat: Category | TaxonomyNode): void {
    this.deleteItemType.set('category');
    this.deleteItemId.set(cat.id);
    this.deleteItemName.set(cat.name);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteItemId();
    const type = this.deleteItemType();
    if (!id || !type) return;

    this.isDeleting.set(true);

    if (type === 'animal') {
      this.animalService.deleteAnimal(id).subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.showDeleteModal.set(false);
          this.showStatus('success', `Animal "${this.deleteItemName()}" deleted successfully.`);
          this.loadAnimals();
          this.totalAnimalsCount.update(c => Math.max(0, c - 1));
        },
        error: (err: Error) => {
          this.isDeleting.set(false);
          this.showStatus('error', err.message || 'Failed to delete animal. Verify if dependent records exist.');
        }
      });
    } else if (type === 'category') {
      this.categoryService.deleteCategory(id).subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.showDeleteModal.set(false);
          this.showStatus('success', `Category "${this.deleteItemName()}" deleted successfully.`);
          this.loadCategories();
          this.taxonomyService.getTaxonomyTree(true).subscribe(tree => {
            this.taxonomyTree.set(tree || []);
          });
          this.totalCategoriesCount.update(c => Math.max(0, c - 1));
        },
        error: (err: Error) => {
          this.isDeleting.set(false);
          this.showStatus('error', err.message || 'Failed to delete category. It may have child sub-categories or assigned animals.');
        }
      });
    } else if (type === 'image') {
      this.animalService.deleteAnimalImage(id).subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.showDeleteModal.set(false);
          this.showStatus('success', 'Animal image deleted successfully.');
          if (this.selectedAnimalForImages()) {
            this.loadImagesForSelectedAnimal(this.selectedAnimalForImages()!.id);
          }
        },
        error: (err: Error) => {
          this.isDeleting.set(false);
          this.showStatus('error', err.message || 'Failed to delete animal image.');
        }
      });
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteItemId.set(null);
    this.deleteItemType.set(null);
  }

  // ================= GBIF OPERATIONS =================

  loadGbifPreview(): void {
    this.isLoadingGbif.set(true);
    this.adminService.getGbifAnimals().subscribe({
      next: (data) => {
        this.gbifPreviewAnimals.set(data?.results || data || []);
        this.isLoadingGbif.set(false);
      },
      error: () => {
        this.isLoadingGbif.set(false);
        this.showStatus('info', 'GBIF preview data feed loaded.');
      }
    });
  }

  startGbifImport(): void {
    if (this.isImportingGbif()) return;

    const key = Number(this.gbifPhylumKey()) || 44;
    const batch = Number(this.gbifBatchSize()) || 1000;
    const off = Number(this.gbifOffset()) || 0;

    const confirmed = confirm(
      `Are you sure you want to start the GBIF batch import for Phylum Key ${key}? (Batch: ${batch}, Offset: ${off})`
    );
    if (!confirmed) return;

    this.isImportingGbif.set(true);
    this.showStatus('info', `Importing species by phylum (${key}) with batch ${batch} and offset ${off}... Please wait.`);

    this.adminService.importGbifByPhylum(key, batch, off).subscribe({
      next: (res: GbifBatchImportResult) => {
        this.isImportingGbif.set(false);
        this.lastBatchResult.set(res);
        if (res.nextOffset != null) {
          this.gbifOffset.set(res.nextOffset);
        }
        const summary = res.message || `Processed: ${res.processed} | Imported: ${res.imported} | Enriched: ${res.enriched} | Next Offset: ${res.nextOffset}`;
        this.showStatus('success', `GBIF Batch Import completed! ${summary}`);
        this.loadAllStatistics();
        this.loadAnimals();
      },
      error: (err: Error) => {
        this.isImportingGbif.set(false);
        this.showStatus('error', err.message || 'GBIF batch import failed.');
      }
    });
  }

  startSingleGbifImport(keyToImport?: number): void {
    const rawKey = keyToImport != null ? keyToImport : this.singleGbifKey();
    const key = Number(rawKey);

    if (!key || isNaN(key) || key <= 0) {
      this.showStatus('error', 'Please enter a valid numeric GBIF Key (e.g. 2435099).');
      return;
    }

    if (this.isImportingSingleGbif()) return;

    this.isImportingSingleGbif.set(true);
    this.showStatus('info', `Importing animal with GBIF Key #${key}... Please wait.`);

    this.adminService.importSingleAnimalByGbifKey(key).subscribe({
      next: (animal) => {
        this.isImportingSingleGbif.set(false);
        this.singleGbifKey.set(null);
        this.lastSingleImportedAnimal.set(animal);
        const name = animal?.name || animal?.scientificName || `Animal #${key}`;
        this.showStatus('success', `Successfully imported "${name}" with complete taxonomy and details from GBIF!`);
        this.loadAllStatistics();
        this.loadAnimals();
      },
      error: (err: Error) => {
        this.isImportingSingleGbif.set(false);
        this.showStatus('error', err.message || `Failed to import animal #${key} from GBIF.`);
      }
    });
  }

  // ================= IMAGE IMPORT OPERATIONS =================

  startGbifImagesImport(): void {
    if (this.isImportingGbifImages()) return;

    this.isImportingGbifImages.set(true);
    this.showStatus('info', 'Importing external images from GBIF media registry...');

    this.adminService.importGbifImages().subscribe({
      next: (response) => {
        this.isImportingGbifImages.set(false);
        this.showStatus('success', typeof response === 'string' ? response : 'GBIF images imported successfully.');
      },
      error: (err: Error) => {
        this.isImportingGbifImages.set(false);
        this.showStatus('error', err.message || 'GBIF image import failed.');
      }
    });
  }

  startAllAnimalImagesImport(): void {
    if (this.isImportingAllImages()) return;

    const confirmed = confirm(
      'Importing images for all animals may take some time. Continue?'
    );
    if (!confirmed) return;

    this.isImportingAllImages.set(true);
    this.showStatus('info', 'Importing Wikimedia images for all catalog species... Please wait.');

    this.adminService.importAllAnimalImages().subscribe({
      next: (response) => {
        this.isImportingAllImages.set(false);
        this.showStatus('success', typeof response === 'string' ? response : 'Wikimedia images imported for all species.');
      },
      error: (err: Error) => {
        this.isImportingAllImages.set(false);
        this.showStatus('error', err.message || 'Global image import failed.');
      }
    });
  }

  importSingleAnimalImage(animalId: number): void {
    this.isImportingSingleAnimalImage.set(true);
    this.showStatus('info', `Importing Wikimedia images for animal #${animalId}...`);

    this.adminService.importAnimalImages(animalId).subscribe({
      next: (response) => {
        this.isImportingSingleAnimalImage.set(false);
        this.showStatus('success', typeof response === 'string' ? response : `Images for animal #${animalId} imported successfully.`);
        if (this.selectedAnimalForImages()?.id === animalId) {
          this.loadImagesForSelectedAnimal(animalId);
        }
      },
      error: (err: Error) => {
        this.isImportingSingleAnimalImage.set(false);
        this.showStatus('error', err.message || `Failed to import images for animal #${animalId}.`);
      }
    });
  }

  // ================= HELPERS =================

  showStatus(type: 'success' | 'error' | 'info', text: string): void {
    this.statusMessage.set({ type, text });
    if (type === 'success') {
      setTimeout(() => {
        if (this.statusMessage()?.text === text) {
          this.statusMessage.set(null);
        }
      }, 5000);
    }
  }

  getRankBadgeClass(rank: string | null | undefined): string {
    if (!rank) return 'rank-default';
    const normalized = rank.toUpperCase().trim();
    switch (normalized) {
      case 'KINGDOM': return 'rank-kingdom';
      case 'PHYLUM': return 'rank-phylum';
      case 'CLASS': return 'rank-class';
      case 'ORDER': return 'rank-order';
      case 'FAMILY': return 'rank-family';
      case 'GENUS': return 'rank-genus';
      case 'SPECIES': return 'rank-species';
      default: return 'rank-default';
    }
  }
}
