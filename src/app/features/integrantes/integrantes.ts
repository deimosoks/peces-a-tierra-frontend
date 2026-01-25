import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { Integrante, MemberFilterRequestDto } from '../../core/models/integrante.model';
import { SafeClickDirective } from '../../shared/directives/safe-click.directive';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-integrantes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SafeClickDirective],
  templateUrl: './integrantes.html',
  styleUrl: './integrantes.css',
})
export class Integrantes implements OnInit {
  private fb = inject(FormBuilder);
  private integranteService = inject(IntegranteService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  members: Integrante[] = [];
  totalPages = 0;
  currentPage = 0;
  onlyActive = true;
  searchQuery = '';
  isLoading = false;
  activeDropdownId: string | null = null;

  // Filter state
  selectedTypes: string[] = [];
  selectedCategories: string[] = [];
  showTypeDropdown = false;
  showCategoryDropdown = false;
  showMobileFiltersModal = false;

  // Available options
  availableTypes = ['INICIANTE', 'VISITANTE', 'MIEMBRO', 'SIMPATIZANTE'];
  availableCategories = ['DAMAS', 'CABALLEROS', 'JOVENES', 'NIÑOS'];

  // Mobile temporary filter state
  tempSelectedTypes: string[] = [];
  tempSelectedCategories: string[] = [];
  tempOnlyActive = true;

  selectedMember?: Integrante;
  showModal = false; // For details
  showFormModal = false; // For Create/Edit

  integranteForm!: FormGroup;
  isEditing = false;
  isSaving = false;
  currentId?: string;

  tipos = ['INICIANTE', 'VISITANTE', 'MIEMBRO', 'SIMPATIZANTE'];
  categorias = ['DAMAS', 'CABALLEROS', 'JOVENES', 'NIÑOS'];
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  ngOnInit() {
    this.initForm();
    this.loadMembers();
  }

  can(permission: string): boolean {
    return this.authService.can(permission);
  }

  initForm() {
    this.integranteForm = this.fb.group({
      completeName: ['', [Validators.required]],
      type: ['VISITANTE', [Validators.required]],
      category: ['JOVENES', [Validators.required]],
      cellphone: [''],
      address: [''],
      birthdate: [''],
      cc: [''],
      active: [true]
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.imagePreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  loadMembers() {
    this.isLoading = true;
    
    const filterRequest: MemberFilterRequestDto = {
      memberType: this.selectedTypes.length > 0 ? this.selectedTypes : undefined,
      memberCategory: this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
      onlyActive: this.onlyActive,
      query: this.searchQuery.trim() || undefined
    };

    this.integranteService.searchMembers(filterRequest, this.currentPage).subscribe({
      next: (res) => {
        this.members = res.members;
        this.totalPages = res.pages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading members:', error);
        this.notificationService.error('Error al cargar los integrantes');
        this.isLoading = false;
      }
    });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadMembers();
  }

  onToggleOnlyActive() {
    this.currentPage = 0;
    this.loadMembers();
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadMembers();
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadMembers();
    }
  }

  toggleMemberStatus(member: Integrante) {
    const newStatus = !member.active;

    this.integranteService.toggleStatus(member.id, newStatus).subscribe({
      next: (currentStatus) => {
        member.active = currentStatus;
        this.notificationService.success(`Integrante ${currentStatus ? 'activado' : 'desactivado'} correctamente`);
      }
    });
  }

  viewMember(member: Integrante) {
    this.selectedMember = member;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedMember = undefined;
  }

  // Filter dropdown management
  toggleTypeDropdown() {
    this.showTypeDropdown = !this.showTypeDropdown;
    if (this.showTypeDropdown) this.showCategoryDropdown = false;
  }

  toggleCategoryDropdown() {
    this.showCategoryDropdown = !this.showCategoryDropdown;
    if (this.showCategoryDropdown) this.showTypeDropdown = false;
  }

  toggleTypeSelection(type: string) {
    const index = this.selectedTypes.indexOf(type);
    if (index > -1) {
      this.selectedTypes.splice(index, 1);
    } else {
      this.selectedTypes.push(type);
    }
    this.currentPage = 0;
    this.loadMembers();
  }

  toggleCategorySelection(category: string) {
    const index = this.selectedCategories.indexOf(category);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(category);
    }
    this.currentPage = 0;
    this.loadMembers();
  }

  isTypeSelected(type: string): boolean {
    return this.selectedTypes.includes(type);
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories.includes(category);
  }

  @HostListener('document:click', ['$event'])
  closeFilterDropdowns(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown-container')) {
      this.showTypeDropdown = false;
      this.showCategoryDropdown = false;
    }
    // Keep existing dropdown logic
    if (!target.closest('.action-dropdown')) {
      this.activeDropdownId = null;
    }
  }

  // Mobile filter modal logic
  openMobileFilters() {
    // Copy current state to temp state
    this.tempSelectedTypes = [...this.selectedTypes];
    this.tempSelectedCategories = [...this.selectedCategories];
    this.tempOnlyActive = this.onlyActive;
    this.showMobileFiltersModal = true;
  }

  closeMobileFilters() {
    this.showMobileFiltersModal = false;
  }

  toggleMobileTypeSelection(type: string) {
    const index = this.tempSelectedTypes.indexOf(type);
    if (index > -1) {
      this.tempSelectedTypes.splice(index, 1);
    } else {
      this.tempSelectedTypes.push(type);
    }
  }

  toggleMobileCategorySelection(category: string) {
    const index = this.tempSelectedCategories.indexOf(category);
    if (index > -1) {
      this.tempSelectedCategories.splice(index, 1);
    } else {
      this.tempSelectedCategories.push(category);
    }
  }

  isMobileTypeSelected(type: string): boolean {
    return this.tempSelectedTypes.includes(type);
  }

  isMobileCategorySelected(category: string): boolean {
    return this.tempSelectedCategories.includes(category);
  }

  applyMobileFilters() {
    // Apply temp state to active state
    this.selectedTypes = [...this.tempSelectedTypes];
    this.selectedCategories = [...this.tempSelectedCategories];
    this.onlyActive = this.tempOnlyActive;
    
    this.currentPage = 0;
    this.loadMembers();
    this.closeMobileFilters();
  }

  openFormModal() {
    this.resetForm();
    this.showFormModal = true;
  }

  closeFormModal() {
    this.showFormModal = false;
    this.resetForm();
  }

  onSubmit() {
    if (this.integranteForm.valid && !this.isSaving) {
      this.isSaving = true;
      const formData = new FormData();
      const formValue = this.integranteForm.value;

      Object.keys(formValue).forEach(key => {
        if (formValue[key] !== null && formValue[key] !== undefined) {
          formData.append(key, formValue[key]);
        }
      });

      if (this.selectedFile) {
        formData.append('pictureProfile', this.selectedFile);
      }

      if (this.isEditing && this.currentId) {
        this.integranteService.updateIntegrante(this.currentId, formData).subscribe({
          next: () => {
            this.isSaving = false;
            this.closeFormModal();
            this.loadMembers();
            this.notificationService.success('Integrante actualizado correctamente');
          },
          error: () => this.isSaving = false
        });
      } else {
        this.integranteService.addIntegrante(formData).subscribe({
          next: () => {
            this.isSaving = false;
            this.closeFormModal();
            this.loadMembers();
            this.notificationService.success('Integrante creado correctamente');
          },
          error: () => this.isSaving = false
        });
      }
    }
  }

  editIntegrante(integrante: Integrante) {
    this.isEditing = true;
    this.currentId = integrante.id;
    this.integranteForm.patchValue(integrante);
    this.imagePreview = integrante.pictureProfileUrl || null;
    this.showFormModal = true;
  }

  async deleteIntegrante(id: string) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Integrante',
      message: '¿Está seguro de eliminar este integrante?',
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.integranteService.deleteIntegrante(id).subscribe(() => {
        this.loadMembers();
        this.notificationService.success('Integrante eliminado correctamente');
      });
    }
  }

  resetForm() {
    this.isEditing = false;
    this.currentId = undefined;
    this.selectedFile = null;
    this.imagePreview = null;
    this.integranteForm.reset({ active: true, type: 'VISITANTE', category: 'JOVENES' });
  }

  getBadgeClass(categoria: string): string {
    switch (categoria) {
      case 'DAMAS': return 'badge-damas';
      case 'CABALLEROS': return 'badge-caballeros';
      case 'JOVENES': return 'badge-jovenes';
      case 'NIÑOS': return 'badge-ninos';
      default: return '';
    }
  }
}
