import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AiChatComponent } from './ai-chat.component';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

describe('AiChatComponent', () => {
  let mockChatService: Partial<ChatService>;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    mockChatService = {
      getSessions: () => of([
        { id: 1, title: 'Taxonomy Intro', createdAt: '2026-08-30' }
      ]),
      getMessages: () => of([
        { id: 101, question: 'What is Rotifera?', answer: 'Rotifera are microscopic pseudocoelomate animals.', createdAt: '2026-08-30' }
      ]),
      createSession: () => of({ id: 2, title: 'New Chat', createdAt: '2026-08-30' }),
      sendMessage: () => of({ id: 102, question: 'Tell me more', answer: 'Rotifers have a ciliated corona.', createdAt: '2026-08-30' }),
      deleteSession: () => of(true),
      clearChatMessages: () => of(true),
      deleteMessage: () => of(true)
    };

    mockAuthService = {
      getCurrentUser: () => ({
        id: 'user-1',
        fullName: 'Ereny Test',
        email: 'ereny@example.com'
      })
    };

    await TestBed.configureTestingModule({
      imports: [AiChatComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ChatService, useValue: mockChatService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();
  });

  it('should create the AI chat component', () => {
    const fixture = TestBed.createComponent(AiChatComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load sessions on init', () => {
    const fixture = TestBed.createComponent(AiChatComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.sessions().length).toBe(1);
    expect(component.sessions()[0].title).toBe('Taxonomy Intro');
  });
});

