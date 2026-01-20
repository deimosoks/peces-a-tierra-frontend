import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const notificationService = inject(NotificationService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {

            if (req.url.includes('/auth/login')) {
                return throwError(() => error);
            }

            if (error.status === 403) {
                window.location.reload();
                return throwError(() => error);
            }

            if (error.status === 401) {
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
