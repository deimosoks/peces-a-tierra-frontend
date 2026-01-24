import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { Integrante } from '../../core/models/integrante.model';
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
    const obs = this.searchQuery
      ? this.integranteService.searchMembers(this.searchQuery, this.currentPage, this.onlyActive)
      : this.integranteService.getMembers(this.currentPage, this.onlyActive);

    obs.subscribe({
      next: (res) => {
        this.members = res.members;
        this.totalPages = res.pages;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
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

  toggleDropdown(event: Event, id: string) {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.activeDropdownId = null;
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
