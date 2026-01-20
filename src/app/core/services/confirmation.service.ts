import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmationOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

@Injectable({
    providedIn: 'root'
})
export class ConfirmationService {
    private confirmationSubject = new Subject<{
        options: ConfirmationOptions,
        resolve: (result: boolean) => void
    }>();

    confirmation$ = this.confirmationSubject.asObservable();

    confirm(options: ConfirmationOptions | string): Promise<boolean> {
        const defaultOptions: ConfirmationOptions = {
            title: 'Confirmación',
            message: typeof options === 'string' ? options : options.message,
            confirmText: 'Aceptar',
            cancelText: 'Cancelar',
            type: 'info'
        };

        const finalOptions = typeof options === 'string' ? defaultOptions : { ...defaultOptions, ...options };

        return new Promise((resolve) => {
            this.confirmationSubject.next({ options: finalOptions, resolve });
        });
    }
}
