import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user';
import { RoleService } from '../../core/services/role';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRequestDto } from '../../core/models/user.model';
import { Role } from '../../core/models/role.model';
import { Integrante } from '../../core/models/integrante.model';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './usuarios.html',
    styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
    private userService = inject(UserService);
    private roleService = inject(RoleService);
    private integranteService = inject(IntegranteService);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    // Data
    users: User[] = [];
    roles: Role[] = [];

    // Pagination & Stats
    totalUsers = 0;
    activeUsers = 0;
    currentPage = 0;
    totalPages = 0;
    searchQuery = '';

    // UI State
    isLoading = true;
    showModal = false;
    showDetailsModal = false;
    isEditing = false;
    errorMessage = '';

    // Form State
    currentUser: UserRequestDto = {
        username: '',
        password: '',
        memberId: '',
        rolesId: []
    };

    // Member Search State
    availableMembers: Integrante[] = [];
    selectedMember: Integrante | null = null;
    memberSearchQuery = '';
    isSearchingMembers = false;

    // Details Modal
    selectedUser: User | null = null;

    ngOnInit() {
        this.loadStats();
        this.loadUsers();
        this.loadRoles();
    }

    can(permission: string): boolean {
        return this.authService.can(permission);
    }

    loadStats() {
        this.userService.getStats().subscribe({
            next: (stats) => {
                this.totalUsers = stats.totalUsers;
                this.activeUsers = stats.totalUsersActives;
            }
        });
    }

    loadUsers() {
        this.isLoading = true;
        const obs = this.searchQuery
            ? this.userService.searchUsers(this.searchQuery, this.currentPage)
            : this.userService.getUsers(this.currentPage);

        obs.subscribe({
            next: (res) => {
                this.users = res.users;
                this.totalPages = res.pages;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading users', err);
                this.isLoading = false;
            }
        });
    }

    loadRoles() {
        this.roleService.getRoles().subscribe(roles => this.roles = roles);
    }

    onSearch() {
        this.currentPage = 0;
        this.loadUsers();
    }

    // Modal & Form Logic
    openNewModal() {
        this.isEditing = false;
        this.currentUser = {
            username: '',
            password: '',
            memberId: '',
            rolesId: []
        };
        this.selectedMember = null;
        this.memberSearchQuery = '';
        this.availableMembers = [];
        this.errorMessage = '';
        this.showModal = true;
    }

    editUser(user: User) {
        this.isEditing = true;
        this._editingId = user.id;
        this.currentUser = {
            username: user.username,
            memberId: user.memberResponseDto.id,
            rolesId: user.roles.map(r => r.id),
            // Password left empty intentionally
        };
        this.selectedMember = user.memberResponseDto;
        this.errorMessage = '';
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
    }

    // Member Search Logic
    onMemberSearch() {
        if (!this.memberSearchQuery.trim()) {
            this.availableMembers = [];
            return;
        }

        this.isSearchingMembers = true;
        this.integranteService.searchMembers(this.memberSearchQuery, 0, true).subscribe({
            next: (res) => {
                this.availableMembers = res.members;
                this.isSearchingMembers = false;
            },
            error: () => this.isSearchingMembers = false
        });
    }

    selectMember(member: Integrante) {
        this.selectedMember = member;
        this.currentUser.memberId = member.id;
        this.availableMembers = []; // Clear results/dropdown
        this.memberSearchQuery = ''; // Clear search input
    }

    clearSelectedMember() {
        this.selectedMember = null;
        this.currentUser.memberId = '';
    }

    // Role Selection Logic
    // Role Selection Logic
    showRoleDropdown = false;

    toggleRoleDropdown() {
        this.showRoleDropdown = !this.showRoleDropdown;
    }

    toggleRole(roleId: string) {
        const index = this.currentUser.rolesId.indexOf(roleId);
        if (index === -1) {
            this.currentUser.rolesId.push(roleId);
        } else {
            this.currentUser.rolesId.splice(index, 1);
        }
    }

    removeRole(roleId: string, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        const index = this.currentUser.rolesId.indexOf(roleId);
        if (index !== -1) {
            this.currentUser.rolesId.splice(index, 1);
        }
    }

    isRoleSelected(roleId: string): boolean {
        return this.currentUser.rolesId.includes(roleId);
    }

    getRoleName(roleId: string): string {
        const role = this.roles.find(r => r.id === roleId);
        return role ? role.name : 'Desconocido';
    }

    getRoleColor(roleId: string): string {
        const role = this.roles.find(r => r.id === roleId);
        return role ? role.color : '#3b82f6';
    }

    // Save
    onSubmit() {
        if (!this.currentUser.memberId && !this.selectedMember) {
            // Although validation should handle this, good to check
            // Note: memberId is inside currentUser
        }

        // Basic frontend validation
        if (!this.isEditing && !this.currentUser.password) {
            this.errorMessage = 'La contraseña es obligatoria para nuevos usuarios';
            return;
        }

        const obs = this.isEditing && this.selectedMember // hacky check for id availability, usually passed separately or in DTO if needed
            // Wait, update endpoint needs ID. The user object in the list has the ID.
            // I need to store the editing ID somewhere.
            // I'll add editingUserId to the class.
            ? this.userService.updateUser(this.editingUserId, this.currentUser)
            : this.userService.createUser(this.currentUser);

        obs.subscribe({
            next: () => {
                this.loadUsers();
                this.loadStats();
                this.closeModal();
            },
            error: (err) => {
                console.error(err);
                this.errorMessage = 'Error al guardar el usuario';
            }
        });
    }

    // Helper for editing ID
    get editingUserId(): string {
        // Find the ID based on the memberId or store it explicitly in editUser
        // Better: store it explicitly.
        // I will use a separate property `editingId`
        return this._editingId;
    }
    private _editingId = '';

    // Override editUser to set _editingId

    // Actions
    // Actions
    toggleProcessing = new Set<string>();

    toggleStatus(user: User) {
        if (this.toggleProcessing.has(user.id)) return;

        this.toggleProcessing.add(user.id);

        // Optimistic update
        const originalStatus = user.active;
        // Don't flip immediately, let the switch animation handle validation or wait for result?
        // Actually, with a switch, it's better to wait or disable.

        setTimeout(() => {
            this.userService.toggleActive(user.id, !user.active).subscribe({
                next: (newStatus) => {
                    user.active = newStatus;
                    this.loadStats();
                    this.toggleProcessing.delete(user.id);
                },
                error: () => {
                    // Revert if error (if we did optimistic)
                    // user.active = originalStatus; 
                    this.toggleProcessing.delete(user.id);
                }
            });
        }, 500); // 500ms delay to prevent spam
    }

    deleteUser(user: User) {
        if (confirm(`¿Eliminar usuario ${user.username}?`)) {
            this.userService.deleteUser(user.id).subscribe(() => {
                this.loadUsers();
                this.loadStats();
            });
        }
    }

    viewDetails(user: User) {
        this.selectedUser = user;
        this.showDetailsModal = true;
    }

    closeDetailsModal() {
        this.showDetailsModal = false;
        this.selectedUser = null;
    }

    copyText(text: string | undefined) {
        if (!text) return;
        navigator.clipboard.writeText(text);
        // Optional: Add toast or visual feedback here
    }

    // Pagination
    changePage(page: number) {
        if (page >= 0 && page < this.totalPages) {
            this.currentPage = page;
            this.loadUsers();
        }
    }

    prevPage() {
        if (this.currentPage > 0) this.changePage(this.currentPage - 1);
    }

    nextPage() {
        if (this.currentPage < this.totalPages - 1) this.changePage(this.currentPage + 1);
    }
}
