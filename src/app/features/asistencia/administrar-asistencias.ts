import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia';
import { AuthService } from '../../core/services/auth.service';
import { IntegranteService } from '../../core/services/integrante'; // Corrected path
import { NotificationService } from '../../core/services/notification.service';
import { AttendanceResponseDto, AttendanceFiltersRequestDto, IglesiaService } from '../../core/models/asistencia.model';
import { Integrante, MemberFilterRequestDto } from '../../core/models/integrante.model';
import { MemberCategoryResponseDto, MemberTypeResponseDto } from '../../core/models/member-config.model';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

import { BranchService } from '../../core/services/branch.service'; // Added import
import { Branch } from '../../core/models/branch.model'; // Added import
import { ServiceCalendarComponent } from '../../shared/components/service-calendar/service-calendar.component';
import { ServiceEvent } from '../../core/models/service-event.model';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-administrar-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceCalendarComponent],
  templateUrl: './administrar-asistencias.html',
  styleUrl: './asistencia.css',
})
export class AdministrarAsistencias implements OnInit {
  private asistenciaService = inject(AsistenciaService);
  private authService = inject(AuthService);
  private integranteService = inject(IntegranteService);
  private notificationService = inject(NotificationService);
  private branchService = inject(BranchService); // Injected

  // Filters & State
  filters: AttendanceFiltersRequestDto = {
    serviceId: '', // Renamed from serviceEventId
    eventId: '',
    startDate: '',
    endDate: '',
    memberId: '',
    branchId: ''
  };
  showFilterModal = false;
  showCalendarModal = false;
  selectedEventLabel = '';

  // Member Search State
  memberSearchQuery: string = '';
  memberSearchResults: Integrante[] = [];
  selectedMemberName: string = '';
  showMemberResults = false;
  private memberSearchSubject = new Subject<string>();

  services: IglesiaService[] = [];
  branches: Branch[] = []; // Added branches array
  attendances: AttendanceResponseDto[] = [];

  isAdmin = false; // Added isAdmin

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
  showExportDropdown = false;
  isExporting = false;

  ngOnInit() {
    this.checkPermissions();
    this.loadServices();
    this.loadAttendances();
    this.setupMemberSearch();
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
    // Formatting dates for backend if they exist
    const searchFilters: AttendanceFiltersRequestDto = {
      serviceId: this.filters.serviceId || undefined,
      eventId: this.filters.eventId || undefined,
      startDate: this.filters.startDate ? `${this.filters.startDate}:00` : undefined,
      endDate: this.filters.endDate ? `${this.filters.endDate}:00` : undefined,
      memberId: this.filters.memberId || undefined,
      branchId: this.filters.branchId || undefined
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

  openCalendarModal() {
    this.showCalendarModal = true;
  }

  closeCalendarModal() {
    this.showCalendarModal = false;
  }

  onEventSelected(event: ServiceEvent) {
    this.filters.eventId = event.id;
    const eventTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eventDate = new Date(event.startDateTime).toLocaleDateString();
    this.selectedEventLabel = `${event.serviceName} (${eventDate} ${eventTime})`;
    this.showCalendarModal = false;
  }

  clearEventFilter() {
    this.filters.eventId = '';
    this.selectedEventLabel = '';
    this.onSearch();
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

  toggleDropdown(event: Event, id: string) {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.activeDropdownId = null;
  }
  getBranchName(id: string | undefined): string {
    if (!id) return '';
    const branch = this.branches.find(b => b.id === id);
    return branch ? branch.name : 'Desconocido';
  }

  exportData(format: 'excel' | 'pdf') {
    this.isExporting = true;
    this.showExportDropdown = false;

    const searchFilters: AttendanceFiltersRequestDto = {
      serviceId: this.filters.serviceId || undefined,
      eventId: this.filters.eventId || undefined,
      startDate: this.filters.startDate ? `${this.filters.startDate}:00` : undefined,
      endDate: this.filters.endDate ? `${this.filters.endDate}:00` : undefined,
      memberId: this.filters.memberId || undefined,
      branchId: this.filters.branchId || undefined
    };

    this.asistenciaService.exportAttendances(searchFilters).subscribe({
      next: (data) => {
        if (format === 'excel') {
          this.downloadExcel(data);
        } else {
          this.downloadPDF(data);
        }
        this.isExporting = false;
        this.notificationService.success(`Asistencias exportadas a ${format === 'excel' ? 'Excel' : 'PDF'}`);
      },
      error: (err) => {
        console.error('Error exporting attendances:', err);
        this.isExporting = false;
        this.notificationService.error('Error al exportar las asistencias');
      }
    });
  }

  private downloadExcel(data: AttendanceResponseDto[]) {
    const worksheetData = data.map(att => ({
      'Integrante': att.memberCompleteName,
      'Servicio': att.serviceName,
      'Sede': att.branchName,
      'Categoría': att.memberCategory?.name || '',
      'Sub-Categoría': att.subCategory?.name || '',
      'Fecha Servicio': formatDate(att.serviceDate, 'dd/MM/yyyy HH:mm', 'en-US'),
      'Hora Llegada': formatDate(att.attendanceDate, 'HH:mm', 'en-US'),
      'Estado': att.invalid ? 'Inválida' : 'Válida',
      'Registrada Por': att.registeredBy,
      'Nota': att.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');
    
    // Auto-size columns
    const max_width = worksheetData.reduce((w, r) => Math.max(w, ...Object.values(r).map(v => v ? v.toString().length : 0)), 10);
    worksheet['!cols'] = Object.keys(worksheetData[0]).map(() => ({ wch: max_width + 5 }));

    XLSX.writeFile(workbook, `Asistencias_${formatDate(new Date(), 'yyyyMMdd_HHmm', 'en-US')}.xlsx`);
  }

  private downloadPDF(data: AttendanceResponseDto[]) {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header
    doc.setFontSize(18);
    doc.text('Reporte de Asistencias', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado el: ${formatDate(new Date(), 'dd/MM/yyyy HH:mm', 'en-US')}`, 14, 30);
    
    const tableData = data.map(att => [
      att.memberCompleteName,
      att.serviceName,
      att.branchName,
      att.memberCategory?.name || '',
      att.serviceDate ? formatDate(att.serviceDate, 'dd/MM/yyyy HH:mm', 'en-US') : '',
      att.attendanceDate ? formatDate(att.attendanceDate, 'HH:mm', 'en-US') : '',
      att.invalid ? 'Inválida' : 'Válida'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Integrante', 'Servicio', 'Sede', 'Categoría', 'Fecha Serv.', 'Llegada', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 35 },
    });

    doc.save(`Asistencias_${formatDate(new Date(), 'yyyyMMdd_HHmm', 'en-US')}.pdf`);
  }

  toggleExportDropdown(event: Event) {
    event.stopPropagation();
    this.showExportDropdown = !this.showExportDropdown;
    this.activeDropdownId = null;
  }
}
