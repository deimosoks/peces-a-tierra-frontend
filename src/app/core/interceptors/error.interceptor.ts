import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const notificationService = inject(NotificationService);
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {

            if (req.url.includes('/auth/login')) {
                return throwError(() => error);
            }

            if (error.status === 403) {
                // Redirect to login and clear session to break the loop for deactivated users
                // This replaces the old window.location.reload() that caused the loop
                authService.logout();
                return throwError(() => error);
            }

            if (error.status === 401) {
                // Let auth.interceptor.ts handle 401s for refresh token logic
                return throwError(() => error);
            }

            let errorMessage = 'An unexpected error occurred';

            if (error.error instanceof ErrorEvent) {
                errorMessage = error.error.message;
            } else {
                errorMessage = error.error?.message || error.message || errorMessage;
            }

            notificationService.error(errorMessage);
            return throwError(() => error);
        })
    );
};
