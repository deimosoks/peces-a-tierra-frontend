import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { IntegranteService } from '../../core/services/integrante';
import { Integrante } from '../../core/models/integrante.model';

@Component({
  selector: 'app-integrantes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './integrantes.html',
  styleUrl: './integrantes.css',
})
export class Integrantes implements OnInit {
  private fb = inject(FormBuilder);
  private integranteService = inject(IntegranteService);

  members: Integrante[] = [];
  totalPages = 0;
  currentPage = 0;
  onlyActive = true;
  searchQuery = '';
  isLoading = false;

  selectedMember?: Integrante;
  showModal = false; // For details
  showFormModal = false; // For Create/Edit

  integranteForm!: FormGroup;
  isEditing = false;
  currentId?: string;

  tipos = ['INICIANTE', 'VISITANTE', 'MIEMBRO', 'SIMPATIZANTE'];
  categorias = ['DAMAS', 'CABALLEROS', 'JOVENES', 'NIÑOS'];
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  ngOnInit() {
    this.initForm();
    this.loadMembers();
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

  togglingIds = new Set<string>();

  toggleMemberStatus(member: Integrante) {
    if (this.togglingIds.has(member.id)) return;

    this.togglingIds.add(member.id);
    const newStatus = !member.active;

    this.integranteService.toggleStatus(member.id, newStatus).subscribe({
      next: (currentStatus) => {
        member.active = currentStatus;
        // Small delay before allowing another toggle
        setTimeout(() => this.togglingIds.delete(member.id), 500);
      },
      error: () => {
        this.togglingIds.delete(member.id);
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

  openFormModal() {
    this.resetForm();
    this.showFormModal = true;
  }

  closeFormModal() {
    this.showFormModal = false;
    this.resetForm();
  }

  onSubmit() {
    if (this.integranteForm.valid) {
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
        this.integranteService.updateIntegrante(this.currentId, formData).subscribe(() => {
          this.closeFormModal();
          this.loadMembers();
        });
      } else {
        this.integranteService.addIntegrante(formData).subscribe(() => {
          this.closeFormModal();
          this.loadMembers();
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

  deleteIntegrante(id: string) {
    if (confirm('¿Está seguro de eliminar este integrante?')) {
      this.integranteService.deleteIntegrante(id).subscribe(() => {
        this.loadMembers();
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
