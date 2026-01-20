import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConfirmationService, ConfirmationOptions } from '../../../core/services/confirmation.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-confirmation-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirmation-modal.html',
    styleUrl: './confirmation-modal.css'
})
export class ConfirmationModalComponent implements OnDestroy {
    private confirmationService = inject(ConfirmationService);
    private router = inject(Router);
    private subscription: Subscription;

    get isLoginPage(): boolean {
        return this.router.url === '/login' || this.router.url === '/';
    }

    show = false;
    options?: ConfirmationOptions;
    resolve?: (result: boolean) => void;

    constructor() {
        this.subscription = this.confirmationService.confirmation$.subscribe(data => {
            this.options = data.options;
            this.resolve = data.resolve;
            this.show = true;
        });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    handleConfirm() {
        this.show = false;
        this.resolve?.(true);
    }

    handleCancel() {
        this.show = false;
        this.resolve?.(false);
    }

    getIconClass(): string {
        switch (this.options?.type) {
            case 'danger': return 'fa-solid fa-triangle-exclamation text-danger';
            case 'warning': return 'fa-solid fa-circle-exclamation text-warning';
            default: return 'fa-solid fa-circle-question text-primary';
        }
    }
}
