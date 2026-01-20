import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Toast } from '../../../core/services/notification.service';

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './toast-container.html',
    styleUrl: './toast-container.css'
})
export class ToastContainerComponent {
    notificationService = inject(NotificationService);
    router = inject(Router);
    toasts$ = this.notificationService.toasts$;

    get isLoginPage(): boolean {
        return this.router.url === '/login' || this.router.url === '/';
    }

    remove(id: number) {
        this.notificationService.remove(id);
    }

    getIcon(type: Toast['type']): string {
        switch (type) {
            case 'success': return 'fa-solid fa-circle-check';
            case 'error': return 'fa-solid fa-circle-xmark';
            case 'warning': return 'fa-solid fa-triangle-exclamation';
            case 'info': return 'fa-solid fa-circle-info';
            default: return 'fa-solid fa-bell';
        }
    }
}
