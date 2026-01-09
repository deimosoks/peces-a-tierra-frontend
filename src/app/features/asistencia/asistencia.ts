import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia';
import { IntegranteService } from '../../core/services/integrante';
import { AuthService } from '../../core/services/auth.service';
import { IglesiaService, AttendanceCreateDto } from '../../core/models/asistencia.model';
import { Integrante } from '../../core/models/integrante.model';

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

  // Filters & State
  attendanceDateTime: string = this.getNowForInput();
  selectedServiceId: string = '';
  searchQuery: string = '';

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
      alert('Por favor seleccione un servicio');
      return;
    }
    if (this.selectedMemberIds.size === 0) {
      alert('Por favor seleccione al menos un integrante');
      return;
    }

    // Use the combined date-time and ensure backend compatibility (adding :00 for seconds)
    const attendanceDate = this.attendanceDateTime.includes(':') && this.attendanceDateTime.split(':').length === 2
      ? `${this.attendanceDateTime}:00`
      : this.attendanceDateTime;

    const attendances: AttendanceCreateDto[] = Array.from(this.selectedMemberIds).map(memberId => ({
      serviceId: this.selectedServiceId,
      memberId: memberId,
      attendanceDate: attendanceDate
    }));

    this.asistenciaService.saveAttendances(attendances).subscribe({
      next: () => {
        alert('Asistencia guardada exitosamente');
        this.selectedMemberIds.clear();
      },
      error: (err) => {
        console.error('Error saving attendance:', err);
        alert('Error al guardar la asistencia');
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
          this.resetServiceForm();
          this.loadAllServices();
        },
        error: () => this.isSavingService = false
      });
    } else {
      this.asistenciaService.addService(this.serviceForm).subscribe({
        next: () => {
          this.isSavingService = false;
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

  deleteService(id: string) {
    if (confirm('¿Está seguro de eliminar este servicio?')) {
      this.asistenciaService.deleteService(id).subscribe(() => {
        this.loadAllServices();
      });
    }
  }

  toggleServiceStatus(service: IglesiaService) {
    const newStatus = !service.active;
    this.asistenciaService.toggleServiceStatus(service.id, newStatus).subscribe(res => {
      service.active = res;
    });
  }

  resetServiceForm() {
    this.serviceForm = { name: '', description: '' };
    this.isEditingService = false;
    this.editingServiceId = undefined;
  }
}
