import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { IglesiaService, AttendanceCreateDto } from '../../core/models/asistencia.model';
import { Integrante, MemberFilterRequestDto, MemberPagesResponseDto } from '../../core/models/integrante.model';
import { MemberConfigService } from '../../core/services/member-config.service';

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.css',
})
export class Asistencia implements OnInit {
  private asistenciaService = inject(AsistenciaService);
  private integranteService = inject(IntegranteService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  // Removed confirmationService as it was unused and causing errors
  // private memberConfigService is now in constructor for explicit injection or we can use inject() here
  
  // Filters & State
  serviceDate: string = this.getNowForInput();
  attendanceDate: string = this.getNowForInput();
  isManualAttendanceTime: boolean = false;
  selectedServiceId: string = '';
  searchQuery: string = '';

  // Note System
  memberNotes: Map<string, string> = new Map();
  showNoteModal = false;
  noteEditingMember?: Integrante;
  tempNote: string = '';

  services: IglesiaService[] = [];
  members: Integrante[] = [];
  selectedMemberIds = new Set<string>();
  selectedMember?: Integrante;
  showModal = false; // For details
  showConfigModal = false; // For mobile config (Renamed from showFilterModal)

  // Pagination
  currentPage = 0;
  totalPages = 0;
  isLoading = false;

  // Advanced Filters State
  showAdvancedFiltersModal = false;
  availableTypes: any[] = [];
  availableCategories: any[] = [];
  
  // Filter Selection State
  selectedTypes: string[] = [];
  selectedCategories: string[] = [];
  selectedSubCategories: string[] = [];
  
  // Boolean Filters
  hasCc: boolean | null = null;
  hasCellphone: boolean | null = null;
  hasAddress: boolean | null = null;
  hasBirthdate: boolean | null = null;
  
  // Range & Location
  ageFilterRange1: number | null = null;
  ageFilterRange2: number | null = null;
  filterLocation: string = '';
  
  // Temp State for Modal
  tempSelectedTypes: string[] = [];
  tempSelectedCategories: string[] = [];
  tempSelectedSubCategories: string[] = [];
  tempHasCc: boolean | null = null;
  tempHasCellphone: boolean | null = null;
  tempHasAddress: boolean | null = null;
  tempHasBirthdate: boolean | null = null;
  tempAgeRange1: number | null = null;
  tempAgeRange2: number | null = null;
  tempLocation: string = '';
  tempOnlyActive: boolean = true;

  constructor(private memberConfigService: MemberConfigService) {}

  ngOnInit() {
    this.loadServices();
    this.loadMemberConfigs();
    this.loadMembers();
  }

  loadMemberConfigs() {
    this.memberConfigService.getTypes().subscribe(types => this.availableTypes = types);
    this.memberConfigService.getCategories().subscribe(categories => this.availableCategories = categories);
  }

  loadServices() {
    this.asistenciaService.getServices(true).subscribe(services => {
      this.services = services;
      // Optional: Auto-select first service if none selected
      if (this.services.length > 0 && !this.selectedServiceId) {
          // this.selectedServiceId = this.services[0].id; // Uncomment if desired
      }
    });
  }

  getSelectedServiceName(): string {
    if (!this.selectedServiceId) return 'Seleccionar Servicio';
    const service = this.services.find(s => s.id === this.selectedServiceId);
    return service ? service.name : 'Servicio no encontrado';
  }

  getMemberAge(member: Integrante): string | number {
    if (!member.birthdate) return '---';
    try {
        const birthDate = new Date(member.birthdate);
        const diff = Date.now() - birthDate.getTime();
        const ageDate = new Date(diff);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch (e) {
        return '---';
    }
  }

  formatAddress(member: Integrante): string {
    return member.address || '---';
  }

  loadMembers() {
    this.isLoading = true;
    
    const filterRequest: MemberFilterRequestDto = {
      onlyActive: true, // Default, can be overridden by tempOnlyActive if mapped
      query: this.searchQuery.trim() || undefined,
      memberType: this.selectedTypes.length > 0 ? this.selectedTypes : undefined,
      memberCategory: this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
      subCategory: this.selectedSubCategories.length > 0 ? this.selectedSubCategories : undefined,
      hasCc: this.hasCc,
      hasCellphone: this.hasCellphone,
      hasAddress: this.hasAddress,
      hasBirthdate: this.hasBirthdate,
      ageFilterRange1: this.ageFilterRange1,
      ageFilterRange2: this.ageFilterRange2,
      location: this.filterLocation || undefined
    };

    if (this.showAdvancedFiltersModal) {
        filterRequest.onlyActive = this.tempOnlyActive; // Use temp state if modal is open/applying
    } else {
        // If we want to persist the 'onlyActive' state from filters, we should add a class property for it
        // For now, let's assume 'onlyActive' is always true unless modified by filters
        filterRequest.onlyActive = this.tempOnlyActive; 
    }

    this.integranteService.searchMembers(filterRequest, this.currentPage).subscribe({
      next: (res: MemberPagesResponseDto) => {
        this.members = res.members;
        this.totalPages = res.pages;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  // Advanced Filters Methods
  openAdvancedFilters() {
    this.tempSelectedTypes = [...this.selectedTypes];
    this.tempSelectedCategories = [...this.selectedCategories];
    this.tempSelectedSubCategories = [...this.selectedSubCategories];
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
    this.selectedSubCategories = [...this.tempSelectedSubCategories];
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

  clearFilters() {
    this.selectedTypes = [];
    this.selectedCategories = [];
    this.selectedSubCategories = [];
    this.hasCc = null;
    this.hasCellphone = null;
    this.hasAddress = null;
    this.hasBirthdate = null;
    this.ageFilterRange1 = null;
    this.ageFilterRange2 = null;
    this.filterLocation = '';
    this.currentPage = 0;
    this.loadMembers();
  }

  // Filter Toggles
  toggleAdvancedTypeSelection(type: string) {
    const index = this.tempSelectedTypes.indexOf(type);
    if (index > -1) this.tempSelectedTypes.splice(index, 1);
    else this.tempSelectedTypes.push(type);
  }

  toggleAdvancedCategorySelection(category: string) {
    const index = this.tempSelectedCategories.indexOf(category);
    if (index > -1) this.tempSelectedCategories.splice(index, 1);
    else this.tempSelectedCategories.push(category);
  }

  toggleAdvancedSubCategorySelection(sub: string) {
    const index = this.tempSelectedSubCategories.indexOf(sub);
    if (index > -1) this.tempSelectedSubCategories.splice(index, 1);
    else this.tempSelectedSubCategories.push(sub);
  }

  setAdvancedFilterValue(filter: 'tempHasCc' | 'tempHasCellphone' | 'tempHasAddress' | 'tempHasBirthdate', value: boolean | null) {
    this[filter] = value;
  }

  isAdvancedTypeSelected(type: string): boolean {
    return this.tempSelectedTypes.includes(type);
  }

  isAdvancedCategorySelected(category: string): boolean {
    return this.tempSelectedCategories.includes(category);
  }

  isAdvancedSubCategorySelected(sub: string): boolean {
    return this.tempSelectedSubCategories.includes(sub);
  }

  isAdvancedFilterActive(filter: 'tempHasCc' | 'tempHasCellphone' | 'tempHasAddress' | 'tempHasBirthdate', value: boolean | null): boolean {
    return this[filter] === value;
  }

  onSearch() {
    this.currentPage = 0;
    this.loadMembers();
  }

  toggleSelection(memberId: string) {
    if (this.selectedMemberIds.has(memberId)) {
      this.selectedMemberIds.delete(memberId);
    } else {
      this.selectedMemberIds.add(memberId);
    }
  }

  isSelected(memberId: string): boolean {
    return this.selectedMemberIds.has(memberId);
  }

  viewMember(member: Integrante) {
    this.selectedMember = member;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedMember = undefined;
  }

  save() {
    if (!this.selectedServiceId) {
      this.notificationService.warning('Por favor seleccione un servicio');
      return;
    }
    if (this.selectedMemberIds.size === 0) {
      this.notificationService.warning('Por favor seleccione al menos un integrante');
      return;
    }

    // Refresh attendance date if automatic
    if (!this.isManualAttendanceTime) {
      this.attendanceDate = this.getNowForInput();
    }

    // Ensure backend compatibility (adding :00 for seconds)
    const formattedServiceDate = this.serviceDate.includes(':') && this.serviceDate.split(':').length === 2
      ? `${this.serviceDate}:00`
      : this.serviceDate;

    const formattedAttendanceDate = this.attendanceDate.includes(':') && this.attendanceDate.split(':').length === 2
      ? `${this.attendanceDate}:00`
      : this.attendanceDate;

    const attendances: AttendanceCreateDto[] = Array.from(this.selectedMemberIds).map(memberId => ({
      serviceId: this.selectedServiceId,
      memberId: memberId,
      serviceDate: formattedServiceDate,
      attendanceDate: formattedAttendanceDate,
      note: this.memberNotes.get(memberId) || undefined
    }));

    this.asistenciaService.saveAttendances(attendances).subscribe({
      next: () => {
        this.isLoading = true;
        this.selectedMemberIds.clear();
        this.memberNotes.clear();
        this.notificationService.success('Asistencia guardada exitosamente');
        this.loadMembers();
      },
      error: (err) => {
        console.error('Error saving attendance:', err);
        // Interceptor handles error display
      }
    });
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

  private getNowForInput(): string {
    const now = new Date();
    // Format to YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // --- Note Modal Methods ---

  openNoteModal(member: Integrante) {
    this.noteEditingMember = member;
    this.tempNote = this.memberNotes.get(member.id) || '';
    this.showNoteModal = true;
  }

  saveMemberNote() {
    if (this.noteEditingMember) {
      if (this.tempNote.trim()) {
        this.memberNotes.set(this.noteEditingMember.id, this.tempNote);
      } else {
        this.memberNotes.delete(this.noteEditingMember.id);
      }
    }
    this.closeNoteModal();
  }

  closeNoteModal() {
    this.showNoteModal = false;
    this.noteEditingMember = undefined;
    this.tempNote = '';
  }

  hasNote(memberId: string): boolean {
    return this.memberNotes.has(memberId);
  }


}
