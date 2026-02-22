import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MemberConfigService } from '../../core/services/member-config.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { 
  MemberCategoryResponseDto, 
  MemberCategoryRequestDto,
  MemberSubCategoryResponseDto,
  MemberSubCategoryRequestDto,
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
  private fb = inject(FormBuilder);
  private configService = inject(MemberConfigService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  // Data
  categories: MemberCategoryResponseDto[] = [];
  types: MemberTypeResponseDto[] = [];

  // Loading States
  isLoadingCategories = true;
  isLoadingTypes = true;

  // Modal States
  showCategoryModal = false;
  showTypeModal = false;
  showSubCategoryModal = false;

  // Edit States
  isEditingCategory = false;
  isEditingType = false;
  isEditingSubCategory = false;
  
  editingCategoryId?: string;
  editingTypeId?: string;
  editingSubCategoryId?: string;
  selectedCategoryIdForSub?: string;

  // Forms
  categoryForm!: FormGroup;
  typeForm!: FormGroup;
  subCategoryForm!: FormGroup;

  // Saving States
  isSavingCategory = false;
  isSavingType = false;
  isSavingSubCategory = false;

  // Block State
  isModifyingBlocked = true; // Bloqueo temporal solicitado por el usuario

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

    this.subCategoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      color: ['#3b82f6', Validators.required],
      categoryId: ['', Validators.required]
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

  // Sub-category methods
  openSubCategoryModal(categoryId: string, subCategory?: MemberSubCategoryResponseDto) {
    this.selectedCategoryIdForSub = categoryId;
    if (subCategory) {
      this.isEditingSubCategory = true;
      this.editingSubCategoryId = subCategory.id;
      this.subCategoryForm.patchValue({
        name: subCategory.name,
        color: subCategory.color,
        categoryId: categoryId
      });
    } else {
      this.isEditingSubCategory = false;
      this.editingSubCategoryId = undefined;
      this.subCategoryForm.reset({ 
        color: '#3b82f6',
        categoryId: categoryId
      });
    }
    this.showSubCategoryModal = true;
  }

  closeSubCategoryModal() {
    this.showSubCategoryModal = false;
    this.subCategoryForm.reset();
    this.isEditingSubCategory = false;
    this.editingSubCategoryId = undefined;
    this.selectedCategoryIdForSub = undefined;
  }

  saveSubCategory() {
    if (this.subCategoryForm.invalid) return;

    this.isSavingSubCategory = true;
    const dto: MemberSubCategoryRequestDto = this.subCategoryForm.value;

    const request = this.isEditingSubCategory && this.editingSubCategoryId
      ? this.configService.updateSubCategory(this.editingSubCategoryId, dto)
      : this.configService.createSubCategory(dto);

    request.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEditingSubCategory ? 'Sub-categoría actualizada' : 'Sub-categoría creada'
        );
        this.loadCategories();
        this.closeSubCategoryModal();
        this.isSavingSubCategory = false;
      },
      error: () => {
        this.notificationService.error('Error al guardar sub-categoría');
        this.isSavingSubCategory = false;
      }
    });
  }

  async deleteSubCategory(subCategory: MemberSubCategoryResponseDto) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Sub-categoría',
      message: `¿Está seguro de eliminar la sub-categoría "${subCategory.name}"?`,
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.configService.deleteSubCategory(subCategory.id).subscribe({
        next: () => {
          this.notificationService.success('Sub-categoría eliminada');
          this.loadCategories();
        },
        error: () => {
          this.notificationService.error('Error al eliminar sub-categoría');
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
