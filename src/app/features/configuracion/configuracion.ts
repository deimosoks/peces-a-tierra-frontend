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
import { CategoryRulesService } from '../../core/services/category-rules.service';
import { CategoryRulesResponseDto, CategoryRulesRequestDto } from '../../core/models/category-rule.model';


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
  private categoryRulesService = inject(CategoryRulesService);

  // Data
  categories: MemberCategoryResponseDto[] = [];
  types: MemberTypeResponseDto[] = [];
  categoryRules: CategoryRulesResponseDto[] = [];

  // Loading States
  isLoadingCategories = true;
  isLoadingTypes = true;
  isLoadingRules = true;

  // Modal States
  showCategoryModal = false;
  showTypeModal = false;
  showSubCategoryModal = false;
  showRuleModal = false;

  // Edit States
  isEditingCategory = false;
  isEditingType = false;
  isEditingSubCategory = false;
  isEditingRule = false;
  
  editingCategoryId?: string;
  editingTypeId?: string;
  editingSubCategoryId?: string;
  editingRuleId?: string;
  selectedCategoryIdForSub?: string;

  // Forms
  categoryForm!: FormGroup;
  typeForm!: FormGroup;
  subCategoryForm!: FormGroup;
  ruleForm!: FormGroup;

  // Saving States
  isSavingCategory = false;
  isSavingType = false;
  isSavingSubCategory = false;
  isSavingRule = false;

  // Block State
  isModifyingBlocked = true; // Bloqueo temporal solicitado por el usuario

  ngOnInit() {
    this.initForms();
    this.loadCategories();
    this.loadTypes();
    this.loadRules();
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

    this.ruleForm = this.fb.group({
      memberCategoryId: ['', Validators.required],
      subCategoryId: [''],
      minAge: [null, [Validators.min(0)]],
      maxAge: [null, [Validators.min(0)]],
      gender: [''], // null or specific gender
      priority: [0, [Validators.required, Validators.min(0)]],
    });

    // Reset subCategory when category changes
    this.ruleForm.get('memberCategoryId')?.valueChanges.subscribe(() => {
      this.ruleForm.patchValue({ subCategoryId: '' });
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

  // Category Rules methods
  get subCategoriesForSelectedRuleCategory(): MemberSubCategoryResponseDto[] {
    const categoryId = this.ruleForm.get('memberCategoryId')?.value;
    if (!categoryId) return [];
    const category = this.categories.find(c => c.id === categoryId);
    return category?.subCategories || [];
  }

  loadRules() {
    this.isLoadingRules = true;
    this.categoryRulesService.findAll().subscribe({
      next: (data) => {
        this.categoryRules = data;
        this.isLoadingRules = false;
      },
      error: () => {
        this.isLoadingRules = false;
        this.notificationService.error('Error al cargar reglas de categoría');
      }
    });
  }

  openRuleModal(rule?: CategoryRulesResponseDto) {
    if (rule) {
      this.isEditingRule = true;
      this.editingRuleId = rule.id;
      this.ruleForm.patchValue({
        memberCategoryId: rule.category.id,
        subCategoryId: rule.subCategory ? rule.subCategory.id : '',
        minAge: rule.minAge !== undefined ? rule.minAge : null,
        maxAge: rule.maxAge !== undefined ? rule.maxAge : null,
        gender: rule.gender || '',
        priority: rule.priority
      });
    } else {
      this.isEditingRule = false;
      this.editingRuleId = undefined;
      this.ruleForm.reset({ minAge: null, maxAge: null, priority: 0, gender: '' });
    }
    this.showRuleModal = true;
  }

  closeRuleModal() {
    this.showRuleModal = false;
    this.ruleForm.reset();
    this.isEditingRule = false;
    this.editingRuleId = undefined;
  }

  saveRule() {
    if (this.ruleForm.invalid) return;

    this.isSavingRule = true;
    const formVals = this.ruleForm.value;
    const dto: CategoryRulesRequestDto = {
      memberCategoryId: formVals.memberCategoryId,
      subCategoryId: formVals.subCategoryId || undefined,
      minAge: formVals.minAge !== '' ? formVals.minAge : null,
      maxAge: formVals.maxAge !== '' ? formVals.maxAge : null,
      gender: formVals.gender ? formVals.gender : null,
      priority: formVals.priority
    };

    const request = this.isEditingRule && this.editingRuleId
      ? this.categoryRulesService.update(this.editingRuleId, dto)
      : this.categoryRulesService.create(dto);

    request.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEditingRule ? 'Regla actualizada' : 'Regla creada'
        );
        this.loadRules();
        this.closeRuleModal();
        this.isSavingRule = false;
      },
      error: () => {
        this.notificationService.error('Error al guardar la regla');
        this.isSavingRule = false;
      }
    });
  }

  toggleRuleStatus(rule: CategoryRulesResponseDto) {
      const newState = !rule.active;
      this.categoryRulesService.updateActive(rule.id, newState).subscribe({
          next: () => {
              rule.active = newState;
              this.notificationService.success(`Regla ${newState ? 'activada' : 'desactivada'} correctamente`);
          },
          error: () => {
              rule.active = !newState; // revert
              this.notificationService.error('Error al cambiar el estado de la regla');
          }
      });
  }

  async deleteRule(rule: CategoryRulesResponseDto) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Regla',
      message: `¿Está seguro de eliminar esta regla?`,
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.categoryRulesService.delete(rule.id).subscribe({
        next: () => {
          this.notificationService.success('Regla eliminada');
          this.loadRules();
        },
        error: () => {
          this.notificationService.error('Error al eliminar la regla');
        }
      });
    }
  }
}
