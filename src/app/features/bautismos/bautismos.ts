import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { BaptismService } from '../../core/services/baptism.service';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { BaptismResponseDto, BaptismFilterRequestDto, BaptismRequestDto, BaptismInvalidRequestDto } from '../../core/models/baptism.model';
import { PagesResponseDto } from '../../core/models/pagination.model';
import { Integrante } from '../../core/models/integrante.model';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { NotificationService } from '../../core/services/notification.service';
import { CertificateService } from '../../core/services/certificate.service';

declare var google: any;

import { BranchService } from '../../core/services/branch.service';
import { Branch } from '../../core/models/branch.model';

@Component({
  selector: 'app-bautismos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './bautismos.html',
  styleUrl: './bautismos.css',
})
export class Bautismos implements OnInit {
  private fb = inject(FormBuilder);
  private baptismService = inject(BaptismService);
  private integranteService = inject(IntegranteService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);
  private certificateService = inject(CertificateService);
  private branchService = inject(BranchService);
  private cdr = inject(ChangeDetectorRef);

  baptisms: BaptismResponseDto[] = [];
  branches: Branch[] = [];
  permissions: any = {};
  isAdmin = false;

  totalPages = 0;
  totalElements = 0;
  currentPage = 0;
  isLoading = false;
  activeDropdownId: string | null = null;

  // Filter state
  filterMemberId = '';
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;
  filterQuery = '';
  filterActive = true;
  filterBranchId = '';

  // Member search
  memberSearchQuery = '';
  memberSearchResults: Integrante[] = [];
  showMemberSearchDropdown = false;
  selectedMember: Integrante | null = null;

  // Modals
  showCreateModal = false;
  showInvalidateModal = false;
  showDetailsModal = false;
  showMobileFilterModal = false; // Reusing as main filter modal or renaming
  showFilterModal = false; // Main filter modal

  selectedBaptism?: BaptismResponseDto;

  baptismForm!: FormGroup;
  invalidateForm!: FormGroup;
  isSaving = false;

  ngOnInit() {
    this.checkPermissions();
    this.initForms();
    this.loadBaptisms();
    this.setupClickOutsideListener();
    if (this.isAdmin) {
        this.loadBranches();
    }
  }

  checkPermissions() {
      this.isAdmin = this.authService.can('ADMINISTRATOR');
  }

  loadBranches() {
      this.branchService.findAll().subscribe({
          next: (data) => this.branches = data,
          error: () => this.notificationService.error('Error al cargar las sedes')
      });
  }

  can(permission: string): boolean {
    return this.authService.can(permission);
  }

  initForms() {
    this.baptismForm = this.fb.group({
      date: ['', Validators.required],
      note: [''],
      address: [''],
      neighborhood: [''],
      city: [''],
      municipality: [''],
      district: [''],
      postalCode: [''],
      latitude: [''],
      longitude: ['']
    });

    this.invalidateForm = this.fb.group({
      invalidReason: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  loadBaptisms() {
    this.isLoading = true;
    const filterRequest: BaptismFilterRequestDto = {
      memberId: this.filterMemberId || undefined,
      startDate: this.filterStartDate || undefined,
      endDate: this.filterEndDate || undefined,
      query: this.filterQuery || undefined,
      active: this.filterActive,
      branchId: this.filterBranchId || undefined
    };

    this.baptismService.search(filterRequest, this.currentPage).subscribe({
      next: (res: PagesResponseDto<BaptismResponseDto>) => {
        this.baptisms = res.data;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.isLoading = false;
        this.scrollToTop();
      },
      error: (err) => {
        console.error('Error loading baptisms:', err);
        this.notificationService.error('Error al cargar los bautismos');
        this.isLoading = false;
      }
    });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadBaptisms();
  }

  clearFilters() {
    this.filterMemberId = '';
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterQuery = '';
    this.filterActive = true;
    this.filterBranchId = '';
    this.currentPage = 0;
    this.loadBaptisms();
  }

  openFilterModal() {
      this.showFilterModal = true;
  }

  closeFilterModal() {
      this.showFilterModal = false;
  }

  // Pagination
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadBaptisms();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadBaptisms();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadBaptisms();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  // Member Search
  searchMembers() {
    if (this.memberSearchQuery.trim().length < 2) {
      this.memberSearchResults = [];
      this.showMemberSearchDropdown = false;
      return;
    }

    this.integranteService.searchMembers({
      query: this.memberSearchQuery,
      onlyActive: true
    }, 0).subscribe({
      next: (res: PagesResponseDto<Integrante>) => {
        this.memberSearchResults = res.data.slice(0, 10);
        this.showMemberSearchDropdown = true;
      },
      error: (err) => {
        console.error('Error searching members:', err);
      }
    });
  }

  selectMember(member: Integrante) {
    this.selectedMember = member;
    this.memberSearchQuery = member.completeName;
    this.showMemberSearchDropdown = false;
  }

  clearMemberSelection() {
    this.selectedMember = null;
    this.memberSearchQuery = '';
    this.memberSearchResults = [];
  }

  // Create Modal
  openCreateModal() {
    this.resetForm();
    this.showCreateModal = true;
    this.cdr.detectChanges();
    // Increase timeout to ensure DOM is fully rendered
    setTimeout(() => this.initGoogleAutocomplete(), 300);
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.resetForm();
  }

  resetForm() {
    this.baptismForm.reset();
    this.selectedMember = null;
    this.memberSearchQuery = '';
  }



  saveBaptism() {
    if (!this.selectedMember) {
      this.notificationService.error('Debe seleccionar un miembro');
      return;
    }

    if (this.baptismForm.invalid) {
      this.notificationService.error('Complete los campos requeridos');
      return;
    }

    this.isSaving = true;
    const formValue = this.baptismForm.value;

    const baptismData: BaptismRequestDto = {
      memberId: this.selectedMember.id,
      date: new Date(formValue.date),
      note: formValue.note,
      imageUrl: undefined,
      address: formValue.address,
      neighborhood: formValue.neighborhood,
      city: formValue.city,
      municipality: formValue.municipality,
      district: formValue.district,
      postalCode: formValue.postalCode,
      latitude: formValue.latitude,
      longitude: formValue.longitude
    };

    this.baptismService.create(baptismData).subscribe({
      next: (res) => {
        this.notificationService.success('Bautismo registrado exitosamente');
        this.closeCreateModal();
        this.loadBaptisms();
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error creating baptism:', err);
        this.notificationService.error('Error al registrar el bautismo');
        this.isSaving = false;
      }
    });
  }

  // Invalidate Modal
  openInvalidateModal(baptism: BaptismResponseDto) {
    this.selectedBaptism = baptism;
    this.invalidateForm.reset();
    this.showInvalidateModal = true;
  }

  closeInvalidateModal() {
    this.showInvalidateModal = false;
    this.selectedBaptism = undefined;
  }

  invalidateBaptism() {
    if (!this.selectedBaptism || this.invalidateForm.invalid) {
      return;
    }

    this.isSaving = true;
    const invalidRequest: BaptismInvalidRequestDto = {
      baptismId: this.selectedBaptism.id,
      invalidReason: this.invalidateForm.value.invalidReason
    };

    this.baptismService.invalidate(invalidRequest).subscribe({
      next: (res) => {
        this.notificationService.success('Bautismo invalidado exitosamente');
        this.closeInvalidateModal();
        this.loadBaptisms();
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error invalidating baptism:', err);
        this.notificationService.error('Error al invalidar el bautismo');
        this.isSaving = false;
      }
    });
  }

  // Details Modal
  openDetailsModal(baptism: BaptismResponseDto) {
    this.selectedBaptism = baptism;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedBaptism = undefined;
  }

  // Certificate Modal State
  showCertificateModal = false;
  certCedula = '';
  certExpedition = '';
  certDocumentType = 'CC'; // Default to CC

  downloadCertificate(baptism: BaptismResponseDto) {
    if (baptism.invalid) {
      this.notificationService.error('No se puede generar certificado de un bautismo inválido');
      return;
    }
    this.selectedBaptism = baptism;
    this.certCedula = '';
    this.certExpedition = '';
    this.certDocumentType = 'CC'; // Reset to default
    this.showCertificateModal = true;
  }

  closeCertificateModal() {
    this.showCertificateModal = false;
    // Only clear selectedBaptism if details modal is NOT open
    if (!this.showDetailsModal) {
        this.selectedBaptism = undefined;
    }
  }

  async confirmDownloadCertificate() {
    if (!this.selectedBaptism) return;
    
    if (!this.certCedula || !this.certExpedition || !this.certDocumentType) {
        this.notificationService.error('Debe completar todos los campos para el certificado');
        return;
    }

    try {
        await this.certificateService.generateBaptismCertificate(
            this.selectedBaptism, 
            this.certCedula, 
            this.certExpedition,
            this.certDocumentType
        );
        this.notificationService.success('Certificado generado correctamente');
        this.closeCertificateModal();
    } catch (error) {
        console.error('Error generating certificate:', error);
        this.notificationService.error('Error al generar el certificado');
    }
  }

  // Dropdown Management
  toggleDropdown(baptismId: string) {
    this.activeDropdownId = this.activeDropdownId === baptismId ? null : baptismId;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.action-dropdown')) {
      this.activeDropdownId = null;
    }
  }

  setupClickOutsideListener() {
    // Click outside listener is handled by @HostListener
  }

  // Google Maps Autocomplete
  initGoogleAutocomplete() {
    const input = document.getElementById('googleAddress') as HTMLInputElement;
    
    if (!input) {
      console.error('Google Maps input element not found');
      return;
    }

    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
      console.error('Google Maps API not loaded');
      return;
    }

    try {
      const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'co' },
        fields: ['address_components', 'geometry', 'formatted_address']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        this.handleGoogleResult(place);
      });

      console.log('Google Maps autocomplete initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Maps autocomplete:', error);
    }
  }

  handleGoogleResult(place: any) {
    if (!place || !place.address_components) {
      return;
    }

    let neighborhood = '';
    let city = '';
    let municipality = '';
    let district = '';
    let postalCode = '';

    // Log for debugging
    console.log('Google Maps components:', place.address_components);

    for (const component of place.address_components) {
      const types = component.types;
      const longName = component.long_name;
      
      // Neighborhood: try multiple types including establishment and natural_feature
      if (!neighborhood && (types.includes('neighborhood') || types.includes('sublocality') || 
          types.includes('sublocality_level_1') || types.includes('sublocality_level_2') ||
          types.includes('sublocality_level_3') || types.includes('route') || 
          types.includes('point_of_interest') || types.includes('establishment') ||
          types.includes('natural_feature'))) {
        neighborhood = longName;
      }
      
      // City: locality
      if (!city && types.includes('locality')) {
        city = longName;
      }
      
      // Municipality: administrative_area_level_2
      if (!municipality && types.includes('administrative_area_level_2')) {
        municipality = longName;
      }
      
      // District/State: administrative_area_level_1
      if (!district && types.includes('administrative_area_level_1')) {
        district = longName;
      }
      
      // Postal Code
      if (!postalCode && types.includes('postal_code')) {
        postalCode = longName;
      }
    }

    // Fallback: if city is empty but municipality exists, use municipality as city
    if (!city && municipality) {
        city = municipality;
    }

    console.log('Parsed address:', { neighborhood, city, municipality, district, postalCode });

    const latitude = place.geometry?.location?.lat()?.toString() || '';
    const longitude = place.geometry?.location?.lng()?.toString() || '';

    this.baptismForm.patchValue({
      address: place.formatted_address || '',
      neighborhood,
      city,
      municipality,
      district,
      postalCode,
      latitude,
      longitude
    });

    this.cdr.detectChanges();
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-CO');
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

  openMobileFilterModal() {
    this.showMobileFilterModal = true;
  }

  closeMobileFilterModal() {
    this.showMobileFilterModal = false;
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
