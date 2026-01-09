import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getAccessToken();

    // Skip adding token for auth endpoints (login, refresh)
    if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
        return next(req);
    }

    // Add token if available
    let authReq = req;
    if (token) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // If 401, try to refresh
                return authService.refreshToken().pipe(
                    switchMap((response) => {
                        // Retry with new token
                        const newReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${response.accessTokenDto.token}`
                            }
                        });
                        return next(newReq);
                    }),
                    catchError((refreshErr) => {
                        // Refresh failed, logout
                        // authService.logout(); // This might cause circular dependency if logout uses HTTP? 
                        // Actually logout uses existing references, but let's be safe.
                        // The service handles logout redirection mostly.
                        return throwError(() => refreshErr);
                    })
                );
            }
            return throwError(() => error);
        })
    );
};
