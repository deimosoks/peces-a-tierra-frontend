import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../core/services/role';
import { AuthService } from '../../core/services/auth.service';
import { Role, PermissionDefinition, RoleRequestDto } from '../../core/models/role.model';

@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './roles.html',
    styleUrl: './roles.css'
})
export class Roles implements OnInit {
    private roleService = inject(RoleService);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    // Data
    roles: Role[] = [];
    availablePermissions: PermissionDefinition[] = [];
    groupedPermissions: { category: string, permissions: PermissionDefinition[] }[] = [];

    // UI state
    isLoading = true;
    showModal = false;
    isEditing = false;
    errorMessage = '';

    // Form State (using DTO structure mostly for logic, but UI binds to a partial object)
    currentRoleName = '';
    currentRoleDesc = '';
    currentRoleColor = '#3b82f6';
    currentRolePermissions: Set<string> = new Set();
    editingRoleId: string | null = null;

    ngOnInit() {
        this.loadPermissions();
    }

    can(permission: string): boolean {
        return this.authService.can(permission);
    }

    loadPermissions() {
        this.roleService.getAvailablePermissions().subscribe(permissions => {
            this.availablePermissions = permissions;
            this.groupPermissions();
            // Load roles after permissions to map them correctly if needed
            this.loadRoles();
        });
    }

    loadRoles() {
        this.isLoading = true;
        this.roleService.getRoles().subscribe({
            next: (roles) => {
                this.roles = roles;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading roles', err);
                this.isLoading = false;
            }
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
        this.editingRoleId = null;
        this.currentRoleName = '';
        this.currentRoleDesc = '';
        this.currentRoleColor = '#3b82f6';
        this.currentRolePermissions.clear();
        this.errorMessage = '';
        this.showModal = true;
    }

    editRole(role: Role) {
        this.isEditing = true;
        this.editingRoleId = role.id;
        this.currentRoleName = role.name;
        this.currentRoleDesc = role.description;
        this.currentRoleColor = role.color;

        this.currentRolePermissions.clear();
        if (role.permissions) {
            role.permissions.forEach(p => this.currentRolePermissions.add(p.name));
        }

        this.errorMessage = '';
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
    }

    togglePermission(permName: string) {
        if (this.currentRolePermissions.has(permName)) {
            this.currentRolePermissions.delete(permName);
        } else {
            this.currentRolePermissions.add(permName);
        }
    }

    isPermissionSelected(permName: string): boolean {
        return this.currentRolePermissions.has(permName);
    }

    saveRole() {
        if (!this.currentRoleName.trim()) {
            this.errorMessage = 'El nombre del rol es obligatorio';
            return;
        }

        const payload: RoleRequestDto = {
            name: this.currentRoleName,
            description: this.currentRoleDesc,
            color: this.currentRoleColor,
            permissions: Array.from(this.currentRolePermissions).map(p => ({ namename: p, name: p }))
            // Wait, backend expects Set<PermissionRequestDto> where DTO has 'name'.
        };

        // Correction: Map string array to object array
        payload.permissions = Array.from(this.currentRolePermissions).map(pName => ({ name: pName }));

        const obs = this.isEditing && this.editingRoleId
            ? this.roleService.updateRole(this.editingRoleId, payload)
            : this.roleService.createRole(payload);

        obs.subscribe({
            next: () => {
                this.loadRoles();
                this.closeModal();
            },
            error: (err) => {
                console.error('Error saving role', err);
                this.errorMessage = 'Ocurrió un error al guardar el rol.';
            }
        });
    }

    deleteRole(role: Role) {
        if (confirm(`¿Estás seguro de eliminar el rol "${role.name}"?`)) {
            this.roleService.deleteRole(role.id).subscribe({
                next: () => this.loadRoles(),
                error: (err) => console.error('Error deleting role', err)
            });
        }
    }
}
