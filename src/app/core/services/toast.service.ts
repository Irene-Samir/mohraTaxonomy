import { Injectable, signal } from '@angular/core';

export interface ToastData {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private currentToastSignal = signal<ToastData | null>(null);
  public currentToast = this.currentToastSignal.asReadonly();

  private timerId: any = null;

  show(text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', durationMs = 4000): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.currentToastSignal.set({ text, type });

    this.timerId = setTimeout(() => {
      this.clear();
    }, durationMs);
  }

  clear(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentToastSignal.set(null);
  }
}

