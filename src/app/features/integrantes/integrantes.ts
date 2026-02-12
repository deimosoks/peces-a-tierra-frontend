import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { Integrante, MemberFilterRequestDto } from '../../core/models/integrante.model';
import { SafeClickDirective } from '../../shared/directives/safe-click.directive';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReportService, ReportColumn } from '../../core/services/report.service';
import { API_CONFIG } from '../../core/config/api.config';
import { MemberConfigService } from '../../core/services/member-config.service';
import { MemberCategoryResponseDto, MemberTypeResponseDto } from '../../core/models/member-config.model';

declare var google: any;

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
  private reportService = inject(ReportService);
  private cdr = inject(ChangeDetectorRef);
  private memberConfigService = inject(MemberConfigService);

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
  showAdvancedFilters = false;
  showAdvancedFiltersModal = false;
  showExportDropdown = false;
  showMobileFiltersModal = false;

  // Advanced bitwise-like filters (null = all, true = has data, false = doesn't have data)
  hasCc: boolean | null = null;
  hasCellphone: boolean | null = null;
  hasAddress: boolean | null = null;
  hasBirthdate: boolean | null = null;
  ageFilterRange1: number | null = null;
  ageFilterRange2: number | null = null;

  // Dynamic available options (fetched from API)
  availableTypes: MemberTypeResponseDto[] = [];
  availableCategories: MemberCategoryResponseDto[] = [];

  // Mobile temporary filter state
  tempSelectedTypes: string[] = [];
  tempSelectedCategories: string[] = [];
  tempOnlyActive = true;
  tempHasCc: boolean | null = null;
  tempHasCellphone: boolean | null = null;
  tempHasAddress: boolean | null = null;
  tempHasBirthdate: boolean | null = null;
  tempAgeRange1: number | null = null;
  tempAgeRange2: number | null = null;
  tempLocation = '';

  // Location Filter (single field)
  filterLocation = '';

  selectedMember?: Integrante;
  showModal = false; // For details
  showFormModal = false; // For Create/Edit
  showNoteModal = false; // For Adding Note

  integranteForm!: FormGroup;
  noteForm!: FormGroup;
  isAddingNote = false;
  isEditing = false;
  isSaving = false;
  currentId?: string;

  // Remove hardcoded arrays - now using availableTypes and availableCategories
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  ngOnInit() {
    this.initForm();
    this.loadCategoriesAndTypes();
    this.loadMembers();
  }

  loadCategoriesAndTypes() {
    this.memberConfigService.getCategories().subscribe({
      next: (data) => this.availableCategories = data,
      error: () => this.notificationService.error('Error al cargar categorías')
    });

    this.memberConfigService.getTypes().subscribe({
      next: (data) => this.availableTypes = data,
      error: () => this.notificationService.error('Error al cargar tipos')
    });
  }

  can(permission: string): boolean {
    return this.authService.can(permission);
  }

  formatAddress(member: Integrante): string {
    const parts = [];
    if (member.neighborhood) parts.push(member.neighborhood);
    if (member.city) parts.push(member.city);
    if (member.municipality) parts.push(member.municipality);
    return parts.length > 0 ? parts.join(', ') : '---';
  }

  initForm() {
    this.integranteForm = this.fb.group({
      completeName: ['', [Validators.required]],
      typeId: ['', [Validators.required]],
      categoryId: ['', [Validators.required]],
      cellphone: [''],
      address: [''],
      neighborhood: [''],
      city: [''],
      municipality: [''],
      district: [''],
      postalCode: [''],
      latitude: [null],
      longitude: [null],
      birthdate: [''],
      cc: [''],
      active: [true]
    });

    this.noteForm = this.fb.group({
      note: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(254)]],
      memberId: ['']
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
      query: this.searchQuery.trim() || undefined,
      hasCc: this.hasCc,
      hasCellphone: this.hasCellphone,
      hasAddress: this.hasAddress,
      hasBirthdate: this.hasBirthdate,
      ageFilterRange1: this.ageFilterRange1,
      ageFilterRange2: this.ageFilterRange2,
      location: this.filterLocation || undefined
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
    if (!target.closest('.advanced-filters-dropdown-container')) {
      this.showAdvancedFilters = false;
    }
    if (!target.closest('.export-dropdown-container')) {
      this.showExportDropdown = false;
    }
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    if (this.showAdvancedFilters) {
      this.showTypeDropdown = false;
      this.showCategoryDropdown = false;
      this.showExportDropdown = false;
    }
  }

  toggleExportDropdown() {
    this.showExportDropdown = !this.showExportDropdown;
    if (this.showExportDropdown) {
      this.showAdvancedFilters = false;
      this.showTypeDropdown = false;
      this.showCategoryDropdown = false;
    }
  }

  setFilterValue(filter: 'hasCc' | 'hasCellphone' | 'hasAddress' | 'hasBirthdate', value: boolean | null) {
    this[filter] = value;
    this.currentPage = 0;
    this.loadMembers();
  }

  onAgeRangeChange() {
    this.currentPage = 0;
    this.loadMembers();
  }

  isFilterActive(filter: 'hasCc' | 'hasCellphone' | 'hasAddress' | 'hasBirthdate', value: boolean | null): boolean {
    return this[filter] === value;
  }

  clearFilters() {
    this.selectedTypes = [];
    this.selectedCategories = [];
    this.hasCc = null;
    this.hasCellphone = null;
    this.hasAddress = null;
    this.hasBirthdate = null;
    this.ageFilterRange1 = null;
    this.ageFilterRange2 = null;
    this.filterLocation = '';
    this.onlyActive = true;
    this.searchQuery = '';
    this.currentPage = 0;
    this.loadMembers();
  }

  exportData(format: 'excel' | 'pdf') {
    const filterRequest: MemberFilterRequestDto = {
      memberType: this.selectedTypes.length > 0 ? this.selectedTypes : undefined,
      memberCategory: this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
      onlyActive: this.onlyActive,
      query: this.searchQuery.trim() || undefined,
      hasCc: this.hasCc,
      hasCellphone: this.hasCellphone,
      hasAddress: this.hasAddress,
      hasBirthdate: this.hasBirthdate,
      ageFilterRange1: this.ageFilterRange1,
      ageFilterRange2: this.ageFilterRange2,
      location: this.filterLocation || undefined
    };

    this.integranteService.exportMembers(filterRequest).subscribe({
      next: (data) => {
        // No additional formatting needed if backend sends names in MemberExportDto
        const formattedData = data;

        const columns: ReportColumn[] = [
          { id: 'completeName', label: 'Nombre Completo', visible: true, order: 1 },
          { id: 'type', label: 'Tipo', visible: true, order: 2 },
          { id: 'category', label: 'Categoría', visible: true, order: 3 },
          { id: 'cc', label: 'Cédula', visible: true, order: 4 },
          { id: 'cellphone', label: 'Teléfono', visible: true, order: 5 },
          { id: 'birthdate', label: 'Nacimiento', visible: true, order: 6 },
          { id: 'age', label: 'Edad', visible: true, order: 7 },
          { id: 'address', label: 'Dirección', visible: true, order: 8 }
        ];

        if (format === 'excel') {
          this.reportService.exportToExcel(formattedData, columns, 'integrantes_export');
        } else {
          this.reportService.exportToPdf(formattedData, columns, 'integrantes_export', 'Reporte de Integrantes');
        }
        this.showExportDropdown = false;
        this.notificationService.success(`Datos exportados a ${format.toUpperCase()} correctamente`);
      },
      error: (error) => {
        console.error('Error exporting members:', error);
        this.notificationService.error('Error al exportar los datos');
      }
    });
  }

  // Mobile filter modal logic
  openMobileFilters() {
    // Copy current state to temp state
    this.tempSelectedTypes = [...this.selectedTypes];
    this.tempSelectedCategories = [...this.selectedCategories];
    this.tempOnlyActive = this.onlyActive;
    this.tempHasCc = this.hasCc;
    this.tempHasCellphone = this.hasCellphone;
    this.tempHasAddress = this.hasAddress;
    this.tempHasBirthdate = this.hasBirthdate;
    this.tempAgeRange1 = this.ageFilterRange1;
    this.tempAgeRange2 = this.ageFilterRange2;
    this.tempLocation = this.filterLocation;
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
    this.hasCc = this.tempHasCc;
    this.hasCellphone = this.tempHasCellphone;
    this.hasAddress = this.tempHasAddress;
    this.hasBirthdate = this.tempHasBirthdate;
    this.ageFilterRange1 = this.tempAgeRange1;
    this.ageFilterRange2 = this.tempAgeRange2;
    this.filterLocation = this.tempLocation;
    
    this.currentPage = 0;
    this.loadMembers();
    this.closeMobileFilters();
  }

  setMobileFilterValue(filter: 'tempHasCc' | 'tempHasCellphone' | 'tempHasAddress' | 'tempHasBirthdate', value: boolean | null) {
    this[filter] = value;
  }

  isMobileFilterActive(filter: 'tempHasCc' | 'tempHasCellphone' | 'tempHasAddress' | 'tempHasBirthdate', value: boolean | null): boolean {
    return this[filter] === value;
  }

  resetMobileFilters() {
    this.tempSelectedTypes = [];
    this.tempSelectedCategories = [];
    this.tempOnlyActive = true;
    this.tempHasCc = null;
    this.tempHasCellphone = null;
    this.tempHasAddress = null;
    this.tempHasBirthdate = null;
    this.tempAgeRange1 = null;
    this.tempAgeRange2 = null;
    this.tempLocation = '';
  }

  // Advanced Filters Modal Methods
  openAdvancedFilters() {
    this.tempSelectedTypes = [...this.selectedTypes];
    this.tempSelectedCategories = [...this.selectedCategories];
    this.tempHasCc = this.hasCc;
    this.tempHasCellphone = this.hasCellphone;
    this.tempHasAddress = this.hasAddress;
    this.tempHasBirthdate = this.hasBirthdate;
    this.tempAgeRange1 = this.ageFilterRange1;
    this.tempAgeRange2 = this.ageFilterRange2;
    this.tempLocation = this.filterLocation;
    this.showAdvancedFiltersModal = true;
  }

  closeAdvancedFilters() {
    this.showAdvancedFiltersModal = false;
  }

  applyAdvancedFilters() {
    this.selectedTypes = [...this.tempSelectedTypes];
    this.selectedCategories = [...this.tempSelectedCategories];
    this.hasCc = this.tempHasCc;
    this.hasCellphone = this.tempHasCellphone;
    this.hasAddress = this.tempHasAddress;
    this.hasBirthdate = this.tempHasBirthdate;
    this.ageFilterRange1 = this.tempAgeRange1;
    this.ageFilterRange2 = this.tempAgeRange2;
    this.filterLocation = this.tempLocation;
    
    this.currentPage = 0;
    this.loadMembers();
    this.closeAdvancedFilters();
  }

  toggleAdvancedTypeSelection(type: string) {
    const index = this.tempSelectedTypes.indexOf(type);
    if (index > -1) {
      this.tempSelectedTypes.splice(index, 1);
    } else {
      this.tempSelectedTypes.push(type);
    }
  }

  toggleAdvancedCategorySelection(category: string) {
    const index = this.tempSelectedCategories.indexOf(category);
    if (index > -1) {
      this.tempSelectedCategories.splice(index, 1);
    } else {
      this.tempSelectedCategories.push(category);
    }
  }

  isAdvancedTypeSelected(type: string): boolean {
    return this.tempSelectedTypes.includes(type);
  }

  isAdvancedCategorySelected(category: string): boolean {
    return this.tempSelectedCategories.includes(category);
  }

  setAdvancedFilterValue(filter: 'tempHasCc' | 'tempHasCellphone' | 'tempHasAddress' | 'tempHasBirthdate', value: boolean | null) {
    this[filter] = value;
  }

  isAdvancedFilterActive(filter: 'tempHasCc' | 'tempHasCellphone' | 'tempHasAddress' | 'tempHasBirthdate', value: boolean | null): boolean {
    return this[filter] === value;
  }

  openFormModal() {
    this.resetForm();
    this.showFormModal = true;
    this.cdr.detectChanges(); // Ensure DOM is updated
    setTimeout(() => this.initializeGeocoder(), 100);
  }

  closeFormModal() {
    this.showFormModal = false;
    this.resetForm();
    // Clean up geocoder if needed (though dom removal helps)
  }

  initializeGeocoder() {
    this.initGoogleAutocomplete();
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
        const place = autocomplete.getPlace();
        this.handleGoogleResult(place);
    });
  }

  handleGoogleResult(place: any) {
    if (!place.geometry) return;

    const fullAddress = place.formatted_address;
    const components = place.address_components;

    let neighborhood = '';
    let city = '';
    let municipality = '';
    let district = '';
    let postalCode = '';

    // Detailed logging for debugging
    console.log('Google Maps components:', components);
    components.forEach((comp: any, index: number) => {
      console.log(`Component ${index}: ${comp.long_name} - Types:`, comp.types);
    });

    for (const component of components) {
        const types = component.types;
        const longName = component.long_name;
        
        // Neighborhood: try multiple types including establishment and natural_feature
        if (!neighborhood && (types.includes('neighborhood') || types.includes('sublocality') || 
            types.includes('sublocality_level_1') || types.includes('sublocality_level_2') ||
            types.includes('sublocality_level_3') || types.includes('route') || 
            types.includes('point_of_interest') || types.includes('establishment') ||
            types.includes('natural_feature'))) {
            neighborhood = longName;
            console.log('✅ Neighborhood found:', longName, 'from types:', types);
        }
        
        // City: locality (preferred)
        if (!city && types.includes('locality')) {
            city = longName;
            console.log('✅ City found:', longName);
        }
        
        // Municipality: administrative_area_level_2
        if (!municipality && types.includes('administrative_area_level_2')) {
            municipality = longName;
            console.log('✅ Municipality found:', longName);
        }
        
        // District/State: administrative_area_level_1
        if (!district && types.includes('administrative_area_level_1')) {
            district = longName;
            console.log('✅ District found:', longName);
        }
        
        // Postal Code
        if (!postalCode && types.includes('postal_code')) {
            postalCode = longName;
            console.log('✅ Postal Code found:', longName);
        }
    }

    // Fallback: if city is empty but municipality exists, use municipality as city
    if (!city && municipality) {
        city = municipality;
        console.log('ℹ️ Using municipality as city (fallback):', city);
    }

    console.log('📍 Final parsed address:', { neighborhood, city, municipality, district, postalCode });

    this.integranteForm.patchValue({
        address: fullAddress,
        neighborhood: neighborhood,
        city: city,
        municipality: municipality,
        district: district,
        postalCode: postalCode,
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng()
    });
    
    this.cdr.detectChanges();
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
    
    // Convert objects to IDs for the form
    const formValue = {
      ...integrante,
      typeId: integrante.type.id,
      categoryId: integrante.category.id
    };
    
    this.integranteForm.patchValue(formValue);
    this.imagePreview = integrante.pictureProfileUrl || null;
    this.showFormModal = true;
    this.cdr.detectChanges();
    setTimeout(() => this.initializeGeocoder(), 100);
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
    this.integranteForm.reset({ 
      active: true, 
      typeId: this.availableTypes.length > 0 ? this.availableTypes[0].id : '', 
      categoryId: this.availableCategories.length > 0 ? this.availableCategories[0].id : '' 
    });
  }

  getBadgeClass(categoria: string): string {
    // This method is now less relevant since we'll use dynamic colors, 
    // but keeping it with a neutral fallback to avoid breaking HTML.
    return '';
  }

  // NOTE METHODS
  openNoteModal(member: Integrante) {
    this.selectedMember = member;
    this.noteForm.reset({
      note: '',
      memberId: member.id
    });
    this.showNoteModal = true;
  }

  closeNoteModal() {
    this.showNoteModal = false;
    this.noteForm.reset();
  }

  onSubmitNote() {
    if (this.noteForm.valid && !this.isAddingNote) {
      this.isAddingNote = true;
      const request = this.noteForm.value;

      this.integranteService.createNote(request).subscribe({
        next: (newNote) => {
          if (this.selectedMember && this.selectedMember.id === request.memberId) {
            if (!this.selectedMember.notes) this.selectedMember.notes = [];
            this.selectedMember.notes.unshift(newNote);
          }
          this.isAddingNote = false;
          this.closeNoteModal();
          this.notificationService.success('Nota agregada correctamente');
        },
        error: (err) => {
          this.isAddingNote = false;
          console.error('Error adding note:', err);
          this.notificationService.error('Error al agregar la nota');
        }
      });
    }
  }

  async deleteNote(noteId: string) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Nota',
      message: '¿Está seguro de eliminar esta nota?',
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed && this.selectedMember) {
      this.integranteService.deleteNote(noteId).subscribe({
        next: () => {
          if (this.selectedMember && this.selectedMember.notes) {
            this.selectedMember.notes = this.selectedMember.notes.filter(n => n.id !== noteId);
          }
          this.notificationService.success('Nota eliminada correctamente');
        },
        error: (err) => {
          console.error('Error deleting note:', err);
          this.notificationService.error('Error al eliminar la nota');
        }
      });
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
}
