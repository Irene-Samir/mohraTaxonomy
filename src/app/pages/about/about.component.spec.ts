import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the about component', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should list Ereny Samir and Mhraeil Samir on the team', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    const component = fixture.componentInstance;
    expect(component.team.length).toBe(2);
    expect(component.team[0].name).toBe('Ereny Samir');
    expect(component.team[1].name).toBe('Mhraeil Samir');
  });

  it('should include GBIF in data sources', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    const component = fixture.componentInstance;
    const gbif = component.dataSources.find(s => s.name.includes('GBIF'));
    expect(gbif).toBeTruthy();
  });
});
