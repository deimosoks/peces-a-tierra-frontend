import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia';
import { AuthService } from '../../core/services/auth.service';
import { IntegranteService } from '../../core/services/integrante'; // Corrected path
import { NotificationService } from '../../core/services/notification.service';
import { AttendanceResponseDto, AttendanceFiltersRequestDto, IglesiaService } from '../../core/models/asistencia.model';
import { Integrante, MemberFilterRequestDto } from '../../core/models/integrante.model';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

@Component({
  selector: 'app-administrar-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administrar-asistencias.html',
  styleUrl: './asistencia.css', // Reusing existing styles
})
export class AdministrarAsistencias implements OnInit {
  private asistenciaService = inject(AsistenciaService);
  private authService = inject(AuthService);
  private integranteService = inject(IntegranteService);
  private notificationService = inject(NotificationService);

  // Filters & State
  filters: AttendanceFiltersRequestDto = {
    serviceId: '',
    startDate: '',
    endDate: '',
    memberId: ''
  };
  showFilterModal = false;

  // Member Search State
  memberSearchQuery: string = '';
  memberSearchResults: Integrante[] = [];
  selectedMemberName: string = '';
  showMemberResults = false;
  private memberSearchSubject = new Subject<string>();

  services: IglesiaService[] = [];
  attendances: AttendanceResponseDto[] = [];

  // Pagination
  currentPage = 0;
  totalPages = 0;
  isLoading = false;

  // Invalidation Modal
  showInvalidateModal = false;
  selectedAttendance?: AttendanceResponseDto;
  invalidReason: string = '';
  isInvalidating = false;

  // Details Modal
  showDetailsModal = false;
  attendanceDetails?: AttendanceResponseDto;
  activeDropdownId: string | null = null;

  ngOnInit() {
    this.loadServices();
    this.loadAttendances();
    this.setupMemberSearch();
  }

  setupMemberSearch() {
    this.memberSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) return [{ members: [], pages: 0 }];
        const filterRequest: MemberFilterRequestDto = {
          onlyActive: true,
          query: query
        };
        return this.integranteService.searchMembers(filterRequest, 0);
      })
    ).subscribe(res => {
      this.memberSearchResults = res.members;
      this.showMemberResults = this.memberSearchResults.length > 0;
    });
  }

  onMemberSearchInput() {
    this.memberSearchSubject.next(this.memberSearchQuery);
  }

  selectMember(member: Integrante) {
    this.filters.memberId = member.id;
    this.selectedMemberName = member.completeName;
    this.showMemberResults = false;
    this.memberSearchQuery = '';
    this.memberSearchResults = [];
    this.onSearch();
  }

  clearMemberFilter() {
    this.filters.memberId = '';
    this.selectedMemberName = '';
    this.onSearch();
  }

  can(permission: string): boolean {
    return this.authService.can(permission);
  }

  loadServices() {
    this.asistenciaService.getServices(true).subscribe(data => {
      this.services = data;
    });
  }

  loadAttendances() {
    this.isLoading = true;

    // Formatting dates for backend if they exist
    const searchFilters: AttendanceFiltersRequestDto = {
      serviceId: this.filters.serviceId || undefined,
      startDate: this.filters.startDate ? `${this.filters.startDate}:00` : undefined,
      endDate: this.filters.endDate ? `${this.filters.endDate}:00` : undefined,
      memberId: this.filters.memberId || undefined
    };

    console.log('Sending Filters Body:', searchFilters);

    this.asistenciaService.getAttendances(searchFilters, this.currentPage).subscribe({
      next: (res: any) => {
        this.attendances = res.attendances;
        this.totalPages = res.pages;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading attendances:', err);
        this.isLoading = false;
      }
    });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadAttendances();
    this.closeFilterModal();
  }

  openFilterModal() {
    this.showFilterModal = true;
  }

  closeFilterModal() {
    this.showFilterModal = false;
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadAttendances();
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadAttendances();
    }
  }

  viewDetails(attendance: AttendanceResponseDto) {
    this.attendanceDetails = attendance;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.attendanceDetails = undefined;
  }

  openInvalidateModal(attendance: AttendanceResponseDto) {
    if (attendance.invalid) return;
    this.selectedAttendance = attendance;
    this.invalidReason = '';
    this.showInvalidateModal = true;
  }

  closeInvalidateModal() {
    this.showInvalidateModal = false;
    this.selectedAttendance = undefined;
    this.invalidReason = '';
  }

  confirmInvalidate() {
    if (!this.selectedAttendance || !this.invalidReason.trim()) return;

    this.isInvalidating = true;
    this.asistenciaService.invalidateAttendance({
      attendanceId: this.selectedAttendance.id,
      invalidReason: this.invalidReason
    }).subscribe({
      next: () => {
        this.isInvalidating = false;
        this.closeInvalidateModal();
        this.loadAttendances();
        this.notificationService.success('Asistencia invalidada correctamente');
      },
      error: (err) => {
        console.error('Error invalidating attendance:', err);
        this.isInvalidating = false;
        // Interceptor handles the error message display
      }
    });
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

  toggleDropdown(event: Event, id: string) {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.activeDropdownId = null;
  }
}
