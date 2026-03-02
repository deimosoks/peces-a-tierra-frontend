import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { SafeClickDirective } from '../../shared/directives/safe-click.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user';
import { RoleService } from '../../core/services/role';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRequestDto } from '../../core/models/user.model';
import { Role } from '../../core/models/role.model';
import { Integrante, MemberFilterRequestDto } from '../../core/models/integrante.model';
import { PagesResponseDto } from '../../core/models/pagination.model';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { NotificationService } from '../../core/services/notification.service';
import { BranchService } from '../../core/services/branch.service';
import { Branch } from '../../core/models/branch.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [CommonModule, FormsModule, SafeClickDirective],
    templateUrl: './usuarios.html',
    styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
    private userService = inject(UserService);
    private roleService = inject(RoleService);
    private integranteService = inject(IntegranteService);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);
    private confirmationService = inject(ConfirmationService);
    private notificationService = inject(NotificationService);
    private branchService = inject(BranchService);

    // Data
    users: User[] = [];
    roles: Role[] = [];

    // Pagination & Stats
    totalUsers = 0;
    activeUsers = 0;
    currentPage = 0;
    totalPages = 0;
    totalElements = 0;
    searchQuery = '';

    // UI State
    isLoading = true;
    showModal = false;
    showDetailsModal = false;
    activeDropdownId: string | null = null;
    isSaving = false;
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
    
    private searchSubject = new Subject<string>();
    private memberSearchSubject = new Subject<string>();

    get isAdmin(): boolean {
        return this.can('ADMINISTRATOR');
    }

    ngOnInit() {
        this.loadStats();
        if (this.isAdmin) {
            this.loadBranches();
        }
        this.setupSearchDebounce();
        this.setupMemberSearchDebounce();
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

    branches: Branch[] = [];
    selectedBranchId = '';

    loadBranches() {
        if (this.isAdmin) {
            this.branchService.findAll().subscribe(branches => this.branches = branches);
        }
    }

    loadUsers() {
        this.isLoading = true;
        this.userService.getUsers(this.currentPage, this.searchQuery, this.selectedBranchId).subscribe({
            next: (response: PagesResponseDto<User>) => {
                this.users = response.data;
                this.totalPages = response.totalPages;
                this.totalElements = response.totalElements;
                this.isLoading = false;
                this.scrollToTop();
            },
            error: (err) => {
                console.error('Error loading users:', err);
                this.isLoading = false;
            }
        });
    }

    loadRoles() {
        this.roleService.getRoles().subscribe(roles => this.roles = roles);
    }

    setupSearchDebounce() {
        this.searchSubject.pipe(
            debounceTime(1000),
            distinctUntilChanged()
        ).subscribe(query => {
            this.searchQuery = query;
            this.onSearch();
        });
    }

    onSearchInput() {
        this.searchSubject.next(this.searchQuery);
    }

    onSearch() {
        this.currentPage = 0; // Reset to first page on new search
        if (this.searchQuery.trim()) {
            this.isLoading = true;
            this.userService.getUsers(this.currentPage, this.searchQuery, this.selectedBranchId).subscribe({
                next: (response: PagesResponseDto<User>) => {
                    this.users = response.data;
                    this.totalPages = response.totalPages;
                    this.totalElements = response.totalElements;
                    this.isLoading = false;
                    this.scrollToTop();
                },
                error: (err) => {
                    console.error('Error searching users:', err);
                    this.isLoading = false;
                }
            });
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            if (this.searchQuery.trim()) {
                this.onSearch();
            } else {
                this.loadUsers();
            }
        }
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            if (this.searchQuery.trim()) {
                this.onSearch();
            } else {
                this.loadUsers();
            }
        }
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
    setupMemberSearchDebounce() {
        this.memberSearchSubject.pipe(
            debounceTime(1000),
            distinctUntilChanged()
        ).subscribe(query => {
            if (!query.trim()) {
                this.availableMembers = [];
                return;
            }
    
            this.isSearchingMembers = true;
            const filterRequest: MemberFilterRequestDto = {
                onlyActive: true,
                query: query
            };
            this.integranteService.searchMembers(filterRequest, 0).subscribe({
                next: (res: PagesResponseDto<Integrante>) => {
                    this.availableMembers = res.data;
                    this.isSearchingMembers = false;
                },
                error: () => this.isSearchingMembers = false
            });
        });
    }

    onMemberSearch() {
        this.memberSearchSubject.next(this.memberSearchQuery);
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

        if (this.isSaving) return;
        this.isSaving = true;

        const payload = { ...this.currentUser };
        if (this.isEditing && !payload.password) {
            delete payload.password;
        }

        const obs = this.isEditing && this.selectedMember
            ? this.userService.updateUser(this.editingUserId, payload)
            : this.userService.createUser(payload);

        obs.subscribe({
            next: () => {
                this.isSaving = false;
                this.loadUsers();
                this.loadStats();
                this.notificationService.success(this.isEditing ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
                this.closeModal();
            },
            error: (err) => {
                this.isSaving = false;
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
    toggleStatus(user: User) {
        if (!this.can('UPDATE_USER')) return;

        const originalStatus = user.active;
        const targetStatus = !originalStatus;

        // Prevenir desactivarse a sí mismo en el frontend
        const currentUsername = this.authService.currentUser()?.username;
        if (user.username === currentUsername && originalStatus === true) {
            this.notificationService.error('No puedes desactivar tu propio usuario.');
            // Revertir visualmente el toggle
            user.active = !originalStatus;
            setTimeout(() => {
                user.active = originalStatus;
                this.cdr.detectChanges();
            }, 0);
            return;
        }

        // Optimistic update
        user.active = targetStatus;

        this.userService.toggleActive(user.id, targetStatus).subscribe({
            next: (newStatus) => {
                user.active = newStatus;
                this.loadStats();
                this.notificationService.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`);
            },
            error: (err) => {
                // Revert if error
                user.active = originalStatus;
            }
        });
    }

    async deleteUser(user: User) {
        const confirmed = await this.confirmationService.confirm({
            title: 'Eliminar Usuario',
            message: `¿Eliminar usuario ${user.username}?`,
            type: 'danger',
            confirmText: 'Eliminar'
        });

        if (confirmed) {
            this.userService.deleteUser(user.id).subscribe(() => {
                this.loadUsers();
                this.loadStats();
                this.notificationService.success('Usuario eliminado correctamente');
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

    toggleDropdown(event: Event, id: string) {
        event.stopPropagation();
        this.activeDropdownId = this.activeDropdownId === id ? null : id;
    }

    @HostListener('document:click')
    closeDropdown() {
        this.activeDropdownId = null;
    }

    copyText(text: string | undefined) {
        if (!text) return;
        navigator.clipboard.writeText(text);
        // Optional: Add toast or visual feedback here
    }

    getBadgeClass(categoria: any): string {
        const name = typeof categoria === 'string' ? categoria : categoria?.name;
        switch (name) {
            case 'DAMAS': return 'badge-damas';
            case 'CABALLEROS': return 'badge-caballeros';
            case 'JOVENES': return 'badge-jovenes';
            case 'NIÑOS': return 'badge-ninos';
            default: return '';
        }
    }

    formatType(type: any): string {
        if (!type) return '';
        if (typeof type === 'string') return type.replace(/_/g, ' ');
        return type.name || '';
    }

    formatCategory(category: any): string {
        if (!category) return '';
        if (typeof category === 'string') return category;
        return category.name || '';
    }

    formatSubCategory(subCategory: any): string {
        if (!subCategory) return '';
        if (typeof subCategory === 'string') return subCategory;
        return subCategory.name || '';
    }

    private scrollToTop() {
        const selectors = ['.page-container', '.table-container', '.full-table', '.list-container'];
        selectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
