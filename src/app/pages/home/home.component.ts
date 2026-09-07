import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TaxonomyService, TaxonomyNode } from '../../core/services/taxonomy.service';
import { AnimalService } from '../../core/services/animal.service';
import { CategoryService } from '../../core/services/category.service';

export interface LineageCrumb {
  rank: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly animalService = inject(AnimalService);
  private readonly categoryService = inject(CategoryService);

  // Dynamic statistics from backend APIs (null indicates loading / not yet available)
  readonly animalCount = signal<number | null>(null);
  readonly isAnimalCountLoading = signal<boolean>(true);

  readonly categoryCount = signal<number | null>(null);
  readonly isCategoryCountLoading = signal<boolean>(true);

  // Loading & Error states
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  // Full Taxonomy Tree from API
  readonly taxonomyTree = signal<TaxonomyNode[]>([]);

  // Navigation Stack Path: e.g. [AnimaliaNode, ChordataNode, MammaliaNode]
  readonly currentPath = signal<TaxonomyNode[]>([]);

  // Node temporarily hovered for inspection in the floating info panel
  readonly hoveredChildNode = signal<TaxonomyNode | null>(null);

  // Zoom animation state: 'idle' | 'zooming-in' | 'zooming-out'
  readonly zoomState = signal<'idle' | 'zooming-in' | 'zooming-out'>('idle');

  /**
   * Active Central Focal Node
   */
  readonly currentNode = computed(() => {
    const path = this.currentPath();
    return path.length > 0 ? path[path.length - 1] : null;
  });

  /**
   * Child nodes of the active central node
   */
  readonly childNodes = computed(() => {
    const node = this.currentNode();
    return node?.children || [];
  });

  /**
   * Node displayed in the floating info panel (hovered child takes precedence)
   */
  readonly activeDisplayNode = computed(() => {
    return this.hoveredChildNode() || this.currentNode();
  });

  /**
   * Complete Lineage breakdown of the active display node
   */
  readonly displayLineage = computed(() => {
    const path = this.currentPath();
    const hovered = this.hoveredChildNode();
    const lineageList: LineageCrumb[] = path.map(n => ({
      rank: n.rank,
      name: n.name,
      icon: this.getNodeIcon(n.name, n.rank)
    }));

    // If a child is being inspected, append it to the preview trail
    if (hovered && hovered.id !== path[path.length - 1]?.id) {
      lineageList.push({
        rank: hovered.rank,
        name: hovered.name,
        icon: this.getNodeIcon(hovered.name, hovered.rank)
      });
    }

    return lineageList;
  });

  ngOnInit(): void {
    this.loadRealTaxonomyTree();
    this.loadHeroStatistics();
  }

  /**
   * Fetch dynamic statistics from backend APIs for the Hero section:
   * 1. Total Animals: GET /api/Animal/count via AnimalService
   * 2. Total Categories: GET /api/Category via CategoryService
   */
  loadHeroStatistics(): void {
    // 1. Animals Count
    this.animalService.getAnimalsCount().subscribe({
      next: (count) => {
        this.animalCount.set(count);
        this.isAnimalCountLoading.set(false);
      },
      error: (err) => {
        console.warn('Failed to load dynamic animal count:', err);
        this.animalCount.set(null);
        this.isAnimalCountLoading.set(false);
      }
    });

    // 2. Categories Count
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        if (categories && Array.isArray(categories)) {
          this.categoryCount.set(categories.length);
        } else {
          this.categoryCount.set(null);
        }
        this.isCategoryCountLoading.set(false);
      },
      error: (err) => {
        console.warn('Failed to load dynamic categories count from CategoryService:', err);
        // Fallback: If category service fails, attempt to calculate count from taxonomy tree nodes
        if (this.taxonomyTree().length > 0) {
          this.categoryCount.set(this.countTreeNodes(this.taxonomyTree()));
        } else {
          this.categoryCount.set(null);
        }
        this.isCategoryCountLoading.set(false);
      }
    });
  }

  /**
   * Helper to recursively count total nodes in a taxonomy tree
   */
  private countTreeNodes(nodes: TaxonomyNode[]): number {
    let count = 0;
    for (const node of nodes) {
      count += 1;
      if (node.children && node.children.length > 0) {
        count += this.countTreeNodes(node.children);
      }
    }
    return count;
  }

  /**
   * Load the real taxonomy hierarchy from the backend API:
   * GET /api/Taxonomy/tree (cached via TaxonomyService shareReplay)
   */
  loadRealTaxonomyTree(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.taxonomyService.getTaxonomyTree().subscribe({
      next: (tree) => {
        if (tree && tree.length > 0) {
          this.taxonomyTree.set(tree);
          // Start exploration at the root (Kingdom Animalia)
          this.currentPath.set([tree[0]]);
        } else {
          this.setupFallbackTree();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('Backend tree loading failed, falling back to local hierarchy:', err);
        this.setupFallbackTree();
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Fallback tree in case of network glitch or during initial SSR prerender
   */
  private setupFallbackTree(): void {
    const fallbackRoot: TaxonomyNode = {
      id: 1,
      name: 'Animalia',
      rank: 'KINGDOM',
      children: [
        {
          id: 2,
          name: 'Chordata',
          rank: 'PHYLUM',
          children: [
            { id: 3, name: 'Mammalia', rank: 'CLASS', children: [] },
            { id: 353, name: 'Aves', rank: 'CLASS', children: [] },
            { id: 291, name: 'Elasmobranchii', rank: 'CLASS', children: [] }
          ]
        },
        {
          id: 99,
          name: 'Arthropoda',
          rank: 'PHYLUM',
          children: [
            { id: 894, name: 'Arachnida', rank: 'CLASS', children: [] },
            { id: 178, name: 'Diplopoda', rank: 'CLASS', children: [] }
          ]
        }
      ]
    };
    this.taxonomyTree.set([fallbackRoot]);
    this.currentPath.set([fallbackRoot]);
  }

  /**
   * Zoom INTO a child taxonomy node with smooth 550ms transition
   */
  zoomIntoNode(childNode: TaxonomyNode): void {
    if (this.zoomState() !== 'idle') return;
    this.hoveredChildNode.set(null);
    this.zoomState.set('zooming-in');

    setTimeout(() => {
      this.currentPath.update(path => [...path, childNode]);
      this.zoomState.set('idle');
    }, 450);
  }

  /**
   * Zoom BACK to the previous parent level
   */
  zoomBack(): void {
    if (this.zoomState() !== 'idle' || this.currentPath().length <= 1) return;
    this.hoveredChildNode.set(null);
    this.zoomState.set('zooming-out');

    setTimeout(() => {
      this.currentPath.update(path => path.slice(0, -1));
      this.zoomState.set('idle');
    }, 450);
  }

  /**
   * Jump directly to an ancestor level from the breadcrumb trail
   */
  jumpToBreadcrumb(targetIndex: number): void {
    const path = this.currentPath();
    if (this.zoomState() !== 'idle' || targetIndex >= path.length - 1) return;

    this.hoveredChildNode.set(null);
    this.zoomState.set('zooming-out');

    setTimeout(() => {
      this.currentPath.set(path.slice(0, targetIndex + 1));
      this.zoomState.set('idle');
    }, 450);
  }

  /**
   * Hover over a child node to spotlight its information
   */
  setHoveredChild(node: TaxonomyNode | null): void {
    this.hoveredChildNode.set(node);
  }

  /**
   * Dynamic SVG curved line coordinates between center and child nodes
   */
  getChildSvgPath(index: number, total: number): string {
    const cx = 500;
    const cy = 300;
    const radius = total <= 4 ? 240 : (total <= 6 ? 265 : 285);
    const angleRad = ((index * (360 / total) - 90) * Math.PI) / 180;
    const tx = cx + radius * Math.cos(angleRad);
    const ty = cy + radius * Math.sin(angleRad);
    
    // Smooth quadratic curve
    const midX = (cx + tx) / 2;
    const midY = (cy + ty) / 2;
    return `M ${cx} ${cy} Q ${midX} ${midY} ${tx} ${ty}`;
  }

  /**
   * Compute child orbit angle for CSS radial placement
   */
  getChildAngle(index: number, total: number): number {
    return (index * (360 / total)) - 90;
  }

  /**
   * Compute child orbit distance for CSS radial placement
   */
  getChildDistance(total: number): number {
    return total <= 4 ? 240 : (total <= 6 ? 265 : 285);
  }

  /**
   * Taxonomy rank & category icons
   */
  getNodeIcon(name: string, rank: string): string {
    const n = name?.toLowerCase() || '';
    if (n.includes('animalia')) return '👑';
    if (n.includes('chordata')) return '🧬';
    if (n.includes('arthropoda')) return '🐞';
    if (n.includes('mammalia')) return '🦁';
    if (n.includes('aves')) return '🦅';
    if (n.includes('reptil')) return '🦎';
    if (n.includes('amphib')) return '🐸';
    if (n.includes('elasmobranch') || n.includes('shark')) return '🦈';
    if (n.includes('actinopter') || n.includes('fish') || n.includes('perciform')) return '🐟';
    if (n.includes('insect')) return '🦋';
    if (n.includes('arachnid') || n.includes('spider')) return '🕷️';
    if (n.includes('diplopod') || n.includes('pauropod')) return '🐛';
    if (n.includes('carnivor')) return '🐾';
    if (n.includes('primat')) return '🐵';
    if (n.includes('felid') || n.includes('panthera')) return '🐆';
    if (n.includes('canid') || n.includes('canis')) return '🐺';
    if (n.includes('rodent')) return '🐿️';
    if (n.includes('chiropter')) return '🦇';

    switch (rank?.toUpperCase()) {
      case 'KINGDOM': return '👑';
      case 'PHYLUM': return '🧬';
      case 'CLASS': return '🌿';
      case 'ORDER': return '🐾';
      case 'FAMILY': return '🦊';
      case 'GENUS': return '🌱';
      case 'SPECIES': return '🦁';
      default: return '🔬';
    }
  }

  /**
   * English-only biological definitions based on scientific standards
   */
  getNodeDefinition(name: string, rank: string): string {
    const n = name?.toLowerCase() || '';
    if (n.includes('animalia')) {
      return 'The kingdom of multicellular, eukaryotic organisms that are heterotrophic, actively motile at some life stage, and develop through distinct embryological phases.';
    }
    if (n.includes('chordata')) {
      return 'Animals possessing a bilateral body plan, a dorsal nerve cord, a supporting notochord, pharyngeal slits, and an endostyle or thyroid gland.';
    }
    if (n.includes('arthropoda')) {
      return 'Invertebrate animals characterized by a jointed chitinous exoskeleton, segmented body tagmata, and bilateral symmetry with paired appendages.';
    }
    if (n.includes('mammalia')) {
      return 'Endothermic amniote vertebrates distinguished by the presence of hair or fur, mammary glands producing milk for nursing, and three auditory ossicles in the middle ear.';
    }
    if (n.includes('aves')) {
      return 'Feathered, winged, bipedal, endothermic vertebrates with toothless beaked jaws, high metabolic rates, and hard-shelled calcium carbonate eggs.';
    }
    if (n.includes('elasmobranchii')) {
      return 'Cartilaginous fish possessing flexible cartilage skeletons rather than bone, five to seven pairs of gill clefts, and rigid dorsal fins.';
    }
    if (n.includes('carnivora')) {
      return 'An order of placental mammals that have specialized carnassial teeth adapted for shearing flesh, keen sensory acuity, and agile predatory limbs.';
    }
    if (n.includes('primates')) {
      return 'A mammalian order characterized by enlarged cerebral hemispheres, forward-facing stereoscopic vision, prehensile extremities, and advanced social dynamics.';
    }
    if (n.includes('arachnida')) {
      return 'Joint-legged chelicerate arthropods possessing eight walking legs, bodies divided into a cephalothorax and abdomen, and lacking wings and antennae.';
    }
    if (n.includes('felidae')) {
      return 'The family of strict, obligate carnivores possessing retractable claws, acute night vision, flexible muscular bodies, and specialized hunting tactics.';
    }
    if (n.includes('canidae')) {
      return 'A family of slender, deep-chested carnivores adapted for endurance pursuit, characterized by non-retractable claws, keen olfaction, and cooperative social pack behavior.';
    }

    return `A recognized biological ${rank.toLowerCase()} comprising closely related organisms sharing significant evolutionary ancestry and morphological traits.`;
  }

  // Why Mohra Features (English Only)
  readonly features = [
    {
      icon: '🔬',
      badge: 'Scientific Standard',
      title: 'Global GBIF Taxonomy',
      description: 'Built directly on the Global Biodiversity Information Facility backbone, aligning with verified international biological nomenclature.'
    },
    {
      icon: '🌳',
      badge: 'Phylogenetic Context',
      title: 'Hierarchical Exploration',
      description: 'Understand the biological kinship uniting all living species through an interactive hierarchy from Kingdom to Species.'
    },
    {
      icon: '⚡',
      badge: 'High Performance',
      title: 'Zero Latency Navigation',
      description: 'Engineered with Angular Signals and client-side caching for instant, responsive exploration with zero redundant network requests.'
    },
    {
      icon: '📖',
      badge: 'Educational Depth',
      title: 'Accurate Biological Data',
      description: 'Explore detailed scientific profiles, taxonomic ranks, and morphological characteristics across thousands of documented species.'
    }
  ];
}