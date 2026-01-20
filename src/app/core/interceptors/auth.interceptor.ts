import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

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
        authReq = addToken(req, token);
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                return handle401Error(authReq, next, authService);
            }
            return throwError(() => error);
        })
    );
};

const addToken = (request: HttpRequest<any>, token: string): HttpRequest<any> => {
    return request.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
};

const handle401Error = (request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<any>> => {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return authService.refreshToken().pipe(
            switchMap((response) => {
                isRefreshing = false;
                const newToken = response.accessTokenDto.token;
                refreshTokenSubject.next(newToken);
                return next(addToken(request, newToken));
            }),
            catchError((err) => {
                isRefreshing = false;
                // If refresh fails, the logout is already handled by AuthService.refreshToken()
                return throwError(() => err);
            })
        );
    } else {
        // Wait for the new token
        return refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap((token) => next(addToken(request, token!)))
        );
    }
};
