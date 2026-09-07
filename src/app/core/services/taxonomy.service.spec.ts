import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TaxonomyService, TaxonomyNode } from './taxonomy.service';
import { Animal } from './animal.service';
import { environment } from '../../../environments/environment';

describe('TaxonomyService', () => {
  let service: TaxonomyService;
  let httpMock: HttpTestingController;

  const mockTree: TaxonomyNode[] = [
    {
      id: 1002,
      name: 'Animalia',
      rank: 'KINGDOM',
      children: [
        {
          id: 1003,
          name: 'Rotifera',
          rank: 'PHYLUM',
          children: [
            {
              id: 1004,
              name: 'Eurotatoria',
              rank: 'CLASS',
              children: [
                {
                  id: 1007,
                  name: 'Hexarthra',
                  rank: 'GENUS',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TaxonomyService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TaxonomyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch taxonomy tree via GET from backend API', () => {
    service.getTaxonomyTree().subscribe(tree => {
      expect(tree).toEqual(mockTree);
      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe('Animalia');
      expect(tree[0].children[0].name).toBe('Rotifera');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/Taxonomy/tree`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTree);
  });

  it('should recursively calculate descendant category IDs for any node', () => {
    const rootNode = mockTree[0];
    const rootDescendants = service.getDescendantCategoryIds(rootNode);
    expect(rootDescendants).toEqual([1002, 1003, 1004, 1007]);

    const rotiferaNode = rootNode.children[0];
    const rotiferaDescendants = service.getDescendantCategoryIds(rotiferaNode);
    expect(rotiferaDescendants).toEqual([1003, 1004, 1007]);

    const hexarthraNode = rotiferaNode.children[0].children[0];
    const hexarthraDescendants = service.getDescendantCategoryIds(hexarthraNode);
    expect(hexarthraDescendants).toEqual([1007]);
  });

  it('should find node and full ancestor path', () => {
    const lookup = service.findNodeAndPath(mockTree, 1007);
    expect(lookup).toBeTruthy();
    expect(lookup?.node.name).toBe('Hexarthra');
    expect(lookup?.path.map(p => p.name)).toEqual(['Animalia', 'Rotifera', 'Eurotatoria', 'Hexarthra']);
  });
});
