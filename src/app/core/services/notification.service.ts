import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private toastsSubject = new BehaviorSubject<Toast[]>([]);
    toasts$ = this.toastsSubject.asObservable();
    private nextId = 0;

    show(message: string, type: Toast['type'] = 'info', duration: number = 5000) {
        const id = this.nextId++;
        const toast: Toast = { id, message, type, duration };
        const currentToasts = this.toastsSubject.value;
        this.toastsSubject.next([...currentToasts, toast]);

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
    }

    success(message: string, duration?: number) {
        this.show(message, 'success', duration);
    }

    error(message: string, duration?: number) {
        this.show(message, 'error', duration);
    }

    info(message: string, duration?: number) {
        this.show(message, 'info', duration);
    }

    warning(message: string, duration?: number) {
        this.show(message, 'warning', duration);
    }

    remove(id: number) {
        const currentToasts = this.toastsSubject.value.filter(t => t.id !== id);
        this.toastsSubject.next(currentToasts);
    }
}
