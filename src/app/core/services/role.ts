import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { Role, RoleRequestDto, PermissionDefinition } from '../models/role.model';

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private http = inject(HttpClient);
    private baseUrl = `${API_CONFIG.baseUrl}/roles`;

    getRoles(): Observable<Role[]> {
        return this.http.get<Role[]>(this.baseUrl);
    }

    getRoleById(id: string): Observable<Role> {
        return this.http.get<Role>(`${this.baseUrl}/${id}`);
    }

    createRole(role: RoleRequestDto): Observable<Role> {
        return this.http.post<Role>(this.baseUrl, role);
    }

    updateRole(id: string, role: RoleRequestDto): Observable<Role> {
        return this.http.put<Role>(`${this.baseUrl}/${id}`, role);
    }

    deleteRole(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    // Static permissions for UI selection
    getAvailablePermissions(): Observable<PermissionDefinition[]> {
        return of([
            // ROLES
            { id: 'VIEW_ROLE_PANEL', name: 'Ver Panel de Roles', description: 'Acceso a la vista de gestión de roles', category: 'ROLES' },
            { id: 'CREATE_ROLE', name: 'Crear Role', description: 'Permite crear nuevos roles de usuario', category: 'ROLES' },
            { id: 'UPDATE_ROLE', name: 'Actualizar Role', description: 'Permite editar roles existentes', category: 'ROLES' },
            { id: 'DELETE_ROLE', name: 'Eliminar Role', description: 'Permite borrar roles del sistema', category: 'ROLES' },

            // MEMBER
            { id: 'VIEW_MEMBER_PANEL', name: 'Ver Panel de Integrantes', description: 'Acceso a la lista de integrantes', category: 'MEMBER' },
            { id: 'CREATE_MEMBER', name: 'Crear Integrante', description: 'Permite registrar nuevos integrantes', category: 'MEMBER' },
            { id: 'UPDATE_MEMBER', name: 'Actualizar Integrante', description: 'Permite editar datos de integrantes', category: 'MEMBER' },
            { id: 'DELETE_MEMBER', name: 'Eliminar Integrante', description: 'Permite dar de baja integrantes', category: 'MEMBER' },

            // USER
            { id: 'VIEW_USER_PANEL', name: 'Ver Panel de Usuarios', description: 'Acceso a gestión de usuarios del sistema', category: 'USER' },
            { id: 'CREATE_USER', name: 'Crear Usuario', description: 'Permite crear usuarios del sistema', category: 'USER' },
            { id: 'UPDATE_USER', name: 'Actualizar Usuario', description: 'Permite editar usuarios del sistema', category: 'USER' },
            { id: 'DELETE_USER', name: 'Eliminar Usuario', description: 'Permite borrar usuarios del sistema', category: 'USER' },

            // SERVICE
            { id: 'VIEW_SERVICE_PANEL', name: 'Ver Panel de Servicios', description: 'Acceso a la configuración de servicios/cultos', category: 'SERVICE' },
            { id: 'CREATE_SERVICE', name: 'Crear Servicio', description: 'Permite crear nuevos tipos de servicios', category: 'SERVICE' },
            { id: 'UPDATE_SERVICE', name: 'Actualizar Servicio', description: 'Permite editar servicios existentes', category: 'SERVICE' },
            { id: 'DELETE_SERVICE', name: 'Eliminar Servicio', description: 'Permite borrar servicios', category: 'SERVICE' },

            // ATTENDANCE
            { id: 'MANAGE_ATTENDANCE', name: 'Gestionar Asistencia', description: 'Permite tomar asistencias', category: 'ATTENDANCE' },

            // REPORT
            { id: 'MANAGE_REPORT', name: 'Gestionar Reportes', description: 'Acceso total a la generación de reportes', category: 'REPORT' },

            // DASHBOARD
            { id: 'MANAGE_DASHBOARD', name: 'Gestionar Dashboard', description: 'Acceso al panel de control principal', category: 'DASHBOARD' }
        ]);
    }
}
