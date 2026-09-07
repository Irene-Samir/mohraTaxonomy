import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/Chat`;
  private readonly http = inject(HttpClient);

  /**
   * Get all chat sessions for the authenticated user:
   * GET /api/Chat/sessions
   */
  getSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.apiUrl}/sessions`).pipe(
      catchError(error => this.handleError(error, 'Unable to load chat sessions.'))
    );
  }

  /**
   * Create a new chat session:
   * POST /api/Chat/session
   */
  createSession(title: string = 'New Biological Research Chat'): Observable<ChatSession> {
    return this.http.post<ChatSession>(`${this.apiUrl}/session`, { title }).pipe(
      catchError(error => this.handleError(error, 'Unable to create chat session.'))
    );
  }

  /**
   * Delete a chat session:
   * DELETE /api/Chat/session/{id}
   */
  deleteSession(sessionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/session/${sessionId}`).pipe(
      catchError(error => this.handleError(error, 'Unable to delete chat session.'))
    );
  }

  /**
   * Get all messages for a specific chat session:
   * GET /api/Chat/{sessionId}
   */
  getMessages(sessionId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/${sessionId}`).pipe(
      catchError(error => this.handleError(error, 'Unable to load messages.'))
    );
  }

  /**
   * Send a question to AI in a specific chat session:
   * POST /api/Chat/{sessionId}/message
   */
  sendMessage(sessionId: number, question: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/${sessionId}/message`, { question }).pipe(
      catchError(error => this.handleError(error, 'Unable to send message to Mohra AI.'))
    );
  }

  /**
   * Delete a single message from history:
   * DELETE /api/Chat/message/{messageId}
   */
  deleteMessage(messageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/message/${messageId}`).pipe(
      catchError(error => this.handleError(error, 'Unable to delete message.'))
    );
  }

  /**
   * Clear all messages in a session:
   * DELETE /api/Chat/{sessionId}/messages
   */
  clearChatMessages(sessionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${sessionId}/messages`).pipe(
      catchError(error => this.handleError(error, 'Unable to clear conversation messages.'))
    );
  }

  private handleError(error: HttpErrorResponse, defaultMsg: string): Observable<never> {
    let msg = defaultMsg;
    if (error.status === 401) {
      msg = 'Please sign in to access Mohra AI assistant.';
    } else if (error.status === 0) {
      msg = `Unable to connect to the server at ${environment.baseUrl}. Please verify the API is running.`;
    } else if (error.error && typeof error.error === 'string') {
      msg = error.error;
    } else if (error.error?.message) {
      msg = error.error.message;
    }
    return throwError(() => new Error(msg));
  }
}
