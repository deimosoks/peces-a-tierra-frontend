import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { permissionRedirectGuard } from './permission-redirect.guard';

export const permissionGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const requiredPermission = route.data['permission'] as string;

    // If no permission is required, allow access
    if (!requiredPermission) {
        return true;
    }

    // Check if user has the specific permission
    if (authService.can(requiredPermission)) {
        return true;
    }

    // If not, redirect to the best available page using our smart redirect logic
    return permissionRedirectGuard(route, state);
};
