import { inject } from '@angular/core';
import { Router, UrlTree, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionRedirectGuard: CanActivateFn = (route, state): UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // If not authenticated, go to login
    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/login']);
    }

    // Check permissions in priority order
    if (authService.can('MANAGE_DASHBOARD')) {
        return router.createUrlTree(['/dashboard']);
    }
    if (authService.can('MANAGE_REPORT')) {
        return router.createUrlTree(['/reportes']);
    }
    if (authService.can('VIEW_MEMBER_PANEL')) {
        return router.createUrlTree(['/integrantes']);
    }
    if (authService.can('MANAGE_ATTENDANCE')) {
        return router.createUrlTree(['/asistencias/administrar']);
    }
    if (authService.can('REGISTER_ATTENDANCE')) {
        return router.createUrlTree(['/asistencia']);
    }
    if (authService.can('VIEW_USER_PANEL')) {
        return router.createUrlTree(['/usuarios']);
    }
    if (authService.can('VIEW_ROLE_PANEL')) {
        return router.createUrlTree(['/roles']);
    }

    // Default fallback if authenticated but trying to access something they can't
    // If they have MANAGE_DASHBOARD, they already went to /dashboard above.
    // If they don't have it, we shouldn't send them to /dashboard as it will loop.
    // For now, let's pick the first one they DO have, or just let them stay if no redirect found.
    return router.createUrlTree(['/login']); // Or a 403 page if you have one
};
