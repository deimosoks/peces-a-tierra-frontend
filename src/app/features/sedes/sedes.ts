import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchService } from '../../core/services/branch.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { RoleService } from '../../core/services/role';
import { Branch, BranchRequestDto } from '../../core/models/branch.model';

declare var google: any;

@Component({
  selector: 'app-sedes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sedes.html',
  styleUrl: './sedes.css'
})
export class Sedes implements OnInit {
  private fb = inject(FormBuilder);
  private branchService = inject(BranchService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  // Data
  branches: Branch[] = [];

  // State
  isLoading = true;
  isSaving = false;
  showModal = false;
  isEditing = false;
  currentBranchId: string | null = null;

  // Permissions
  canCreate = false;
  canUpdate = false;
  canDelete = false;

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      cellphone: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.checkPermissions();
    this.loadBranches();
  }

  checkPermissions() {
    this.canCreate = this.authService.can('BRANCH_CREATE');
    this.canUpdate = this.authService.can('BRANCH_UPDATE');
    this.canDelete = this.authService.can('BRANCH_DELETE');
  }

  loadBranches() {
    this.isLoading = true;
    this.branchService.findAll().subscribe({
      next: (data) => {
        this.branches = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading branches', err);
        this.isLoading = false;
        this.notificationService.error('Error al cargar las sedes');
      }
    });
  }

  openModal(branch?: Branch) {
    this.isEditing = !!branch;
    this.currentBranchId = branch?.id || null;
    
    if (branch) {
      this.form.patchValue({
        name: branch.name,
        address: branch.address,
        city: branch.city,
        cellphone: branch.cellphone
      });
    } else {
      this.form.reset({
        name: '',
        address: '',
        city: '',
        cellphone: ''
      });
    }
    
    this.showModal = true;
    // Initialize autocomplete after modal is rendered
    setTimeout(() => this.initGoogleAutocomplete(), 100);
  }

  closeModal() {
    this.showModal = false;
    this.form.reset();
    this.isSaving = false;
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    
    this.isSaving = true;
    const dto: BranchRequestDto = this.form.value;
    
    const request = this.isEditing && this.currentBranchId
      ? this.branchService.update(this.currentBranchId, dto)
      : this.branchService.create(dto);
      
    request.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEditing ? 'Sede actualizada correctamente' : 'Sede creada correctamente'
        );
        this.loadBranches();
        this.closeModal();
      },
      error: (err) => {
        console.error('Error saving branch', err);
        this.notificationService.error('Error al guardar la sede');
        this.isSaving = false;
      }
    });
  }

  async deleteBranch(branch: Branch) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Sede',
      message: `¿Estás seguro de eliminar la sede "${branch.name}"? Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.branchService.delete(branch.id).subscribe({
        next: () => {
          this.notificationService.success('Sede eliminada correctamente');
          this.loadBranches();
        },
        error: (err) => {
          console.error('Error deleting branch', err);
          this.notificationService.error('Error al eliminar la sede');
        }
      });
    }
  }

  initGoogleAutocomplete() {
    const input = document.getElementById('googleAddress') as HTMLInputElement;
    if (!input) return;

    if (typeof google === 'undefined') {
        console.error('Google Maps API not loaded');
        return;
    }

    const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'co' },
        fields: ['address_components', 'geometry', 'formatted_address'],
        types: ['geocode', 'establishment']
    });

    autocomplete.addListener('place_changed', () => {
        this.ngZone.run(() => {
            const place = autocomplete.getPlace();
            this.handleGoogleResult(place);
        });
    });
  }

  handleGoogleResult(place: any) {
    if (!place.geometry) return;

    const components = place.address_components;
    let city = '';
    
    // Find city (locality)
    for (const component of components) {
        const types = component.types;
        if (types.includes('locality')) {
            city = component.long_name;
            break;
        }
    }

    // Update form
    this.form.patchValue({
        address: place.formatted_address,
        city: city || this.form.get('city')?.value // Keep existing city if none found
    });
  }
}
