import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../core/services/role';
import { Role, Permission } from '../../core/models/role.model';

@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './roles.html',
    styleUrl: './roles.css'
})
export class Roles implements OnInit {
    private roleService = inject(RoleService);
    private cdr = inject(ChangeDetectorRef);

    roles: Role[] = [];
    availablePermissions: Permission[] = [];
    groupedPermissions: { category: string, permissions: Permission[] }[] = [];

    isLoading = true;
    showModal = false;
    isEditing = false;

    // Form State
    currentRole: Partial<Role> = {
        name: '',
        description: '',
        permissions: [],
        color: '#3b82f6'
    };

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading = true;
        this.roleService.getRoles().subscribe({
            next: (roles) => {
                this.roles = roles;
                this.loadPermissions();
            },
            error: () => {
                // Fallback for demo/dev if API fails
                this.roles = [
                    {
                        id: '1', name: 'Administrador', description: 'Acceso total al sistema', permissions: [
                            'VIEW_ROLE_PANEL', 'CREATE_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
                            'VIEW_MEMBER_PANEL', 'CREATE_MEMBER', 'UPDATE_MEMBER', 'DELETE_MEMBER',
                            'VIEW_USER_PANEL', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
                            'VIEW_SERVICE_PANEL', 'CREATE_SERVICE', 'UPDATE_SERVICE', 'DELETE_SERVICE',
                            'MANAGE_ATTENDANCE', 'MANAGE_REPORT', 'MANAGE_DASHBOARD'
                        ], memberCount: 3, color: '#ef4444'
                    },
                    {
                        id: '2', name: 'Pastor', description: 'Visualización de reportes y gestión básica', permissions: [
                            'VIEW_DASHBOARD', 'VIEW_MEMBER_PANEL', 'MANAGE_REPORT', 'MANAGE_DASHBOARD'
                        ], memberCount: 1, color: '#8b5cf6'
                    },
                    {
                        id: '3', name: 'Secretaría', description: 'Registro de integrantes y asistencia', permissions: [
                            'VIEW_MEMBER_PANEL', 'CREATE_MEMBER', 'UPDATE_MEMBER', 'MANAGE_ATTENDANCE'
                        ], memberCount: 5, color: '#10b981'
                    }
                ];
                this.loadPermissions();
            }
        });
    }

    loadPermissions() {
        this.roleService.getAvailablePermissions().subscribe(permissions => {
            this.availablePermissions = permissions;
            this.groupPermissions();
            this.isLoading = false;
            this.cdr.detectChanges();
        });
    }

    groupPermissions() {
        const categories = Array.from(new Set(this.availablePermissions.map(p => p.category)));
        this.groupedPermissions = categories.map(cat => ({
            category: cat,
            permissions: this.availablePermissions.filter(p => p.category === cat)
        }));
    }

    openNewModal() {
        this.isEditing = false;
        this.currentRole = {
            name: '',
            description: '',
            permissions: [],
            color: '#3b82f6'
        };
        this.showModal = true;
    }

    editRole(role: Role) {
        this.isEditing = true;
        this.currentRole = { ...role, permissions: [...role.permissions] };
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
    }

    togglePermission(permId: string) {
        const perms = this.currentRole.permissions || [];
        if (perms.includes(permId)) {
            this.currentRole.permissions = perms.filter(id => id !== permId);
        } else {
            this.currentRole.permissions = [...perms, permId];
        }
    }

    hasPermission(permId: string): boolean {
        return this.currentRole.permissions?.includes(permId) || false;
    }

    saveRole() {
        if (!this.currentRole.name) return;

        const obs = this.isEditing && this.currentRole.id
            ? this.roleService.updateRole(this.currentRole.id, this.currentRole)
            : this.roleService.createRole(this.currentRole);

        obs.subscribe({
            next: () => {
                this.loadData();
                this.closeModal();
            },
            error: () => {
                // Local update for demo/dev
                if (this.isEditing) {
                    const idx = this.roles.findIndex(r => r.id === this.currentRole.id);
                    if (idx !== -1) this.roles[idx] = { ...this.roles[idx], ...this.currentRole as Role };
                } else {
                    this.roles.push({ ...this.currentRole as Role, id: Math.random().toString(36).substr(2, 9), memberCount: 0 });
                }
                this.closeModal();
                this.cdr.detectChanges();
            }
        });
    }

    deleteRole(role: Role) {
        if (confirm(`¿Estás seguro de eliminar el rol "${role.name}"?`)) {
            this.roleService.deleteRole(role.id).subscribe({
                next: () => this.loadData(),
                error: () => {
                    this.roles = this.roles.filter(r => r.id !== role.id);
                    this.cdr.detectChanges();
                }
            });
        }
    }
}
