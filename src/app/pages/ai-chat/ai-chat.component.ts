import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatSession, ChatMessage } from '../../core/services/chat.service';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.css'
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('messagesScroll') private messagesScrollContainer?: ElementRef;

  sessions = signal<ChatSession[]>([]);
  activeSessionId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);

  isLoadingSessions = signal<boolean>(true);
  isLoadingMessages = signal<boolean>(false);
  isSendingMessage = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  userQuestion = signal<string>('');
  sidebarOpen = signal<boolean>(false);

  currentUser = signal<User | null>(null);
  private shouldScrollToBottom = false;

  activeSession = computed(() => {
    const id = this.activeSessionId();
    if (!id) return null;
    return this.sessions().find(s => s.id === id) || null;
  });

  promptSuggestions = [
    'Tell me about Kingdom Animalia classification',
    'What are the key characteristics of Phylum Chordata?',
    'Explain the taxonomy and habitat of Rotifera',
    'How do biological taxonomic ranks work from Kingdom to Species?'
  ];

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());

    // 1. Load chat sessions
    this.loadSessions();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Load all sessions for current user
   */
  loadSessions(): void {
    this.isLoadingSessions.set(true);
    this.errorMessage.set(null);

    this.chatService.getSessions().subscribe({
      next: (data) => {
        this.sessions.set(data || []);
        this.isLoadingSessions.set(false);

        // Check if query param specifies a session ID
        this.route.queryParams.subscribe(params => {
          const querySessionId = params['sessionId'] ? Number(params['sessionId']) : null;
          if (querySessionId && this.sessions().some(s => s.id === querySessionId)) {
            this.selectSession(querySessionId);
          } else if (this.sessions().length > 0 && !this.activeSessionId()) {
            this.selectSession(this.sessions()[0].id);
          }
        });
      },
      error: (err: Error) => {
        this.isLoadingSessions.set(false);
        this.errorMessage.set(err.message || 'Unable to load chat sessions.');
      }
    });
  }

  /**
   * Select an active session and load its messages
   */
  selectSession(sessionId: number): void {
    if (this.activeSessionId() === sessionId && this.messages().length > 0) {
      this.sidebarOpen.set(false);
      return;
    }

    this.activeSessionId.set(sessionId);
    this.isLoadingMessages.set(true);
    this.sidebarOpen.set(false);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sessionId },
      queryParamsHandling: 'merge'
    });

    this.chatService.getMessages(sessionId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs || []);
        this.isLoadingMessages.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.isLoadingMessages.set(false);
      }
    });
  }

  /**
   * Create a new chat session
   */
  createNewChat(): void {
    this.chatService.createSession('New Biological Research Chat').subscribe({
      next: (newSession) => {
        this.sessions.update(list => [newSession, ...list]);
        this.selectSession(newSession.id);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message || 'Unable to create new chat.');
      }
    });
  }

  /**
   * Handle Enter key to send message and Shift+Enter for newline
   */
  onKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Send a question to AI in the active session
   */
  sendMessage(): void {
    const question = this.userQuestion().trim();
    if (!question || this.isSendingMessage()) return;

    this.isSendingMessage.set(true);
    this.userQuestion.set('');

    const currentSessionId = this.activeSessionId();

    if (!currentSessionId) {
      // Create session first then send
      const sessionTitle = question.length > 35 ? question.slice(0, 32) + '...' : question;
      this.chatService.createSession(sessionTitle).subscribe({
        next: (session) => {
          this.sessions.update(list => [session, ...list]);
          this.activeSessionId.set(session.id);
          this.executeSendMessage(session.id, question);
        },
        error: () => {
          this.isSendingMessage.set(false);
        }
      });
    } else {
      this.executeSendMessage(currentSessionId, question);
    }
  }

  private executeSendMessage(sessionId: number, question: string): void {
    this.shouldScrollToBottom = true;

    this.chatService.sendMessage(sessionId, question).subscribe({
      next: (msg) => {
        this.messages.update(list => [...list, msg]);
        this.isSendingMessage.set(false);
        this.shouldScrollToBottom = true;

        // If session was untitled or default, update its title in the list
        const active = this.activeSession();
        if (active && (active.title.startsWith('New Biological') || active.title === 'New Chat')) {
          const newTitle = question.length > 35 ? question.slice(0, 32) + '...' : question;
          this.sessions.update(list =>
            list.map(s => s.id === sessionId ? { ...s, title: newTitle } : s)
          );
        }
      },
      error: (err: Error) => {
        this.isSendingMessage.set(false);
        this.errorMessage.set(err.message || 'Failed to receive AI response. Please try again.');
      }
    });
  }

  /**
   * Send pre-set prompt suggestion
   */
  sendSuggestion(prompt: string): void {
    this.userQuestion.set(prompt);
    this.sendMessage();
  }

  /**
   * Delete a chat session
   */
  deleteSession(sessionId: number, event: Event): void {
    event.stopPropagation();
    this.chatService.deleteSession(sessionId).subscribe({
      next: () => {
        this.sessions.update(list => list.filter(s => s.id !== sessionId));
        if (this.activeSessionId() === sessionId) {
          const remaining = this.sessions();
          if (remaining.length > 0) {
            this.selectSession(remaining[0].id);
          } else {
            this.activeSessionId.set(null);
            this.messages.set([]);
          }
        }
      }
    });
  }

  /**
   * Clear all messages in current session
   */
  clearCurrentChat(): void {
    const sessionId = this.activeSessionId();
    if (!sessionId) return;

    this.chatService.clearChatMessages(sessionId).subscribe({
      next: () => {
        this.messages.set([]);
      }
    });
  }

  /**
   * Delete single message
   */
  deleteMessage(messageId: number): void {
    this.chatService.deleteMessage(messageId).subscribe({
      next: () => {
        this.messages.update(list => list.filter(m => m.id !== messageId));
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesScrollContainer) {
        this.messagesScrollContainer.nativeElement.scrollTop =
          this.messagesScrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  formatTime(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
