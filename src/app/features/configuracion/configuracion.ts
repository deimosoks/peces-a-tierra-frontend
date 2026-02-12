import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MemberConfigService } from '../../core/services/member-config.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { 
  MemberCategoryResponseDto, 
  MemberCategoryRequestDto,
  MemberTypeResponseDto,
  MemberTypeRequestDto 
} from '../../core/models/member-config.model';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class Configuracion implements OnInit {
  private configService = inject(MemberConfigService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  // Data
  categories: MemberCategoryResponseDto[] = [];
  types: MemberTypeResponseDto[] = [];

  // Modal states
  showCategoryModal = false;
  showTypeModal = false;
  isEditingCategory = false;
  isEditingType = false;
  editingCategoryId?: string;
  editingTypeId?: string;

  // Forms
  categoryForm!: FormGroup;
  typeForm!: FormGroup;

  // Loading states
  isSavingCategory = false;
  isSavingType = false;
  isLoadingCategories = false;
  isLoadingTypes = false;

  ngOnInit() {
    this.initForms();
    this.loadCategories();
    this.loadTypes();
  }

  initForms() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      color: ['#3b82f6', Validators.required]
    });

    this.typeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      color: ['#10b981', Validators.required]
    });
  }

  // Category methods
  loadCategories() {
    this.isLoadingCategories = true;
    this.configService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.isLoadingCategories = false;
      },
      error: () => {
        this.isLoadingCategories = false;
        this.notificationService.error('Error al cargar categorías');
      }
    });
  }

  openCategoryModal(category?: MemberCategoryResponseDto) {
    if (category) {
      this.isEditingCategory = true;
      this.editingCategoryId = category.id;
      this.categoryForm.patchValue({
        name: category.name,
        color: category.color
      });
    } else {
      this.isEditingCategory = false;
      this.editingCategoryId = undefined;
      this.categoryForm.reset({ color: '#3b82f6' });
    }
    this.showCategoryModal = true;
  }

  closeCategoryModal() {
    this.showCategoryModal = false;
    this.categoryForm.reset();
    this.isEditingCategory = false;
    this.editingCategoryId = undefined;
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;

    this.isSavingCategory = true;
    const dto: MemberCategoryRequestDto = this.categoryForm.value;

    const request = this.isEditingCategory && this.editingCategoryId
      ? this.configService.updateCategory(this.editingCategoryId, dto)
      : this.configService.createCategory(dto);

    request.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEditingCategory ? 'Categoría actualizada' : 'Categoría creada'
        );
        this.loadCategories();
        this.closeCategoryModal();
        this.isSavingCategory = false;
      },
      error: () => {
        this.notificationService.error('Error al guardar categoría');
        this.isSavingCategory = false;
      }
    });
  }

  async deleteCategory(category: MemberCategoryResponseDto) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Categoría',
      message: `¿Está seguro de eliminar la categoría "${category.name}"?`,
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.configService.deleteCategory(category.id).subscribe({
        next: () => {
          this.notificationService.success('Categoría eliminada');
          this.loadCategories();
        },
        error: () => {
          this.notificationService.error('Error al eliminar categoría');
        }
      });
    }
  }

  // Type methods
  loadTypes() {
    this.isLoadingTypes = true;
    this.configService.getTypes().subscribe({
      next: (data) => {
        this.types = data;
        this.isLoadingTypes = false;
      },
      error: () => {
        this.isLoadingTypes = false;
        this.notificationService.error('Error al cargar tipos');
      }
    });
  }

  openTypeModal(type?: MemberTypeResponseDto) {
    if (type) {
      this.isEditingType = true;
      this.editingTypeId = type.id;
      this.typeForm.patchValue({
        name: type.name,
        color: type.color
      });
    } else {
      this.isEditingType = false;
      this.editingTypeId = undefined;
      this.typeForm.reset({ color: '#10b981' });
    }
    this.showTypeModal = true;
  }

  closeTypeModal() {
    this.showTypeModal = false;
    this.typeForm.reset();
    this.isEditingType = false;
    this.editingTypeId = undefined;
  }

  saveType() {
    if (this.typeForm.invalid) return;

    this.isSavingType = true;
    const dto: MemberTypeRequestDto = this.typeForm.value;

    const request = this.isEditingType && this.editingTypeId
      ? this.configService.updateType(this.editingTypeId, dto)
      : this.configService.createType(dto);

    request.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEditingType ? 'Tipo actualizado' : 'Tipo creado'
        );
        this.loadTypes();
        this.closeTypeModal();
        this.isSavingType = false;
      },
      error: () => {
        this.notificationService.error('Error al guardar tipo');
        this.isSavingType = false;
      }
    });
  }

  async deleteType(type: MemberTypeResponseDto) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Tipo',
      message: `¿Está seguro de eliminar el tipo "${type.name}"?`,
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.configService.deleteType(type.id).subscribe({
        next: () => {
          this.notificationService.success('Tipo eliminado');
          this.loadTypes();
        },
        error: () => {
          this.notificationService.error('Error al eliminar tipo');
        }
      });
    }
  }
}
