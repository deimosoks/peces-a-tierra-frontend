import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError, BehaviorSubject, map, switchMap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { LoginRequest, LoginResponse, UserInfo } from '../models/auth.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private readonly baseUrl = `${API_CONFIG.baseUrl}/auth`;

    // State Signals
    private currentUserSig = signal<UserInfo | null>(null);
    currentUser = this.currentUserSig.asReadonly();

    isAuthenticated = computed(() => !!this.currentUserSig());

    // Token Management
    private readonly ACCESS_TOKEN_KEY = 'access_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';

    constructor() {
        // Session restoration is now handled by APP_INITIALIZER
    }

    // Called by APP_INITIALIZER
    initialize(): Observable<any> {
        if (this.getAccessToken()) {
            return this.loadCurrentUser().pipe(
                catchError(() => of(true)) // Don't block app start on error
            );
        }
        return of(true);
    }

    login(credentials: LoginRequest): Observable<any> {
        return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
            switchMap(response => {
                this.storeTokens(response);
                return this.loadCurrentUser();
            })
        );
    }

    logout() {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
            // Call backend logout
            this.http.post(`${this.baseUrl}/logout`, { refreshToken }).subscribe({
                error: () => console.warn('Logout failed on backend')
            });
        }

        this.clearSession();
        this.router.navigate(['/login']);
    }

    refreshToken(): Observable<LoginResponse> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token'));
        }

        return this.http.post<LoginResponse>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
            tap(response => this.storeTokens(response)),
            catchError(err => {
                this.logout();
                return throwError(() => err);
            })
        );
    }

    loadCurrentUser(): Observable<UserInfo> {
        return this.http.get<UserInfo>(`${API_CONFIG.baseUrl}/users/@me`).pipe(
            tap(user => this.currentUserSig.set(user)),
            catchError(() => {
                // If fetching user fails (e.g. invalid token despite having one), clear session
                // But let the interceptor handle 401s first. 
                // If this is called manually and fails, arguably we might want to clear.
                return of(null as any);
            })
        );
    }

    // Permission Helper
    can(permissionName: string): boolean {
        const user = this.currentUserSig();
        if (!user || !user.permissions) return false;

        // Superadmin bypass
        if (user.permissions.includes('ADMINISTRATOR')) return true;

        return user.permissions.includes(permissionName);
    }


    // --- Token Helpers ---
    getAccessToken(): string | null {
        return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    private storeTokens(response: LoginResponse) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, response.accessTokenDto.token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshTokenDto.token);
    }

    private clearSession() {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        this.currentUserSig.set(null);
    }
}
