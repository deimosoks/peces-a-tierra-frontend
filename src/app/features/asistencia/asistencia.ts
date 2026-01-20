import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { IglesiaService, AttendanceCreateDto } from '../../core/models/asistencia.model';
import { Integrante } from '../../core/models/integrante.model';
import { ConfirmationService } from '../../core/services/confirmation.service';

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
  private confirmationService = inject(ConfirmationService);

  // Filters & State
  serviceDate: string = this.getNowForInput();
  attendanceDate: string = this.getNowForInput();
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
  showServicesModal = false; // For services management

  // Services Management State
  servicesAll: IglesiaService[] = [];
  serviceForm = { name: '', description: '' };
  isEditingService = false;
  editingServiceId?: string;
  isSavingService = false;

  // Pagination
  currentPage = 0;
  totalPages = 0;
  isLoading = false;

  ngOnInit() {
    this.loadServices();
    this.loadMembers();
  }

  can(permission: string): boolean {
    return this.authService.can(permission);
  }

  loadServices() {
    this.asistenciaService.getServices(true).subscribe(data => {
      this.services = data;
      if (this.services.length > 0) {
        this.selectedServiceId = this.services[0].id;
      }
    });
  }

  loadMembers() {
    this.isLoading = true;
    const obs = this.searchQuery
      ? this.integranteService.searchMembers(this.searchQuery, this.currentPage, true)
      : this.integranteService.getMembers(this.currentPage, true);

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

  getBadgeClass(categoria: string): string {
    switch (categoria) {
      case 'DAMAS': return 'badge-damas';
      case 'CABALLEROS': return 'badge-caballeros';
      case 'JOVENES': return 'badge-jovenes';
      case 'NIÑOS': return 'badge-ninos';
      default: return '';
    }
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

  // --- Service Management Methods ---

  openServicesModal() {
    this.showServicesModal = true;
    this.loadAllServices();
  }

  closeServicesModal() {
    this.showServicesModal = false;
    this.resetServiceForm();
    this.loadServices(); // Refresh main dropdown
  }

  loadAllServices() {
    this.asistenciaService.getServices(false).subscribe(data => {
      this.servicesAll = data;
    });
  }

  onServiceSubmit() {
    if (!this.serviceForm.name || !this.serviceForm.description) return;

    this.isSavingService = true;
    if (this.isEditingService && this.editingServiceId) {
      this.asistenciaService.updateService(this.editingServiceId, this.serviceForm).subscribe({
        next: () => {
          this.isSavingService = false;
          this.notificationService.success('Servicio actualizado correctamente');
          this.resetServiceForm();
          this.loadAllServices();
        },
        error: () => this.isSavingService = false
      });
    } else {
      this.asistenciaService.addService(this.serviceForm).subscribe({
        next: () => {
          this.isSavingService = false;
          this.notificationService.success('Servicio creado correctamente');
          this.resetServiceForm();
          this.loadAllServices();
        },
        error: () => this.isSavingService = false
      });
    }
  }

  editService(service: IglesiaService) {
    this.isEditingService = true;
    this.editingServiceId = service.id;
    this.serviceForm = {
      name: service.name,
      description: service.description || ''
    };
  }

  async deleteService(id: string) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar Servicio',
      message: '¿Está seguro de eliminar este servicio?',
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.asistenciaService.deleteService(id).subscribe(() => {
        this.loadAllServices();
        this.notificationService.success('Servicio eliminado correctamente');
      });
    }
  }

  toggleServiceStatus(service: IglesiaService) {
    const newStatus = !service.active;
    this.asistenciaService.toggleServiceStatus(service.id, newStatus).subscribe(res => {
      service.active = res;
      this.notificationService.success(`Servicio ${res ? 'activado' : 'desactivado'} correctamente`);
    });
  }

  resetServiceForm() {
    this.serviceForm = { name: '', description: '' };
    this.isEditingService = false;
    this.editingServiceId = undefined;
  }
}
