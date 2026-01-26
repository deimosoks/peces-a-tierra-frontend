import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { SafeClickDirective } from '../../shared/directives/safe-click.directive';
import { IglesiaService } from '../../core/models/asistencia.model';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeClickDirective],
  templateUrl: './servicios.html',
  styleUrl: './servicios.css',
})
export class Servicios implements OnInit {
  private asistenciaService = inject(AsistenciaService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  services: IglesiaService[] = [];
  serviceForm = { name: '', description: '' };
  isEditingService = false;
  editingServiceId?: string;
  isSavingService = false;
  showFormModal = false; // For mobile modal
  activeDropdownId: string | null = null;
  isLoading = false;

  ngOnInit() {
    this.loadServices();
  }

  can(permission: string): boolean {
    return this.authService.can(permission);
  }

  openFormModal() {
    this.showFormModal = true;
  }

  closeFormModal() {
    this.showFormModal = false;
    this.resetServiceForm();
  }

  loadServices() {
    this.isLoading = true;
    this.asistenciaService.getServices(false).subscribe({
      next: (data) => {
        this.services = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
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
          this.loadServices();
          this.closeFormModal();
        },
        error: () => this.isSavingService = false
      });
    } else {
      this.asistenciaService.addService(this.serviceForm).subscribe({
        next: () => {
          this.isSavingService = false;
          this.notificationService.success('Servicio creado correctamente');
          this.resetServiceForm();
          this.loadServices();
          this.closeFormModal();
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
    this.openFormModal(); // Open modal on mobile
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
        this.loadServices();
        this.notificationService.success('Servicio eliminado correctamente');
      });
    }
  }

  toggleServiceStatus(service: IglesiaService) {
    const newStatus = !service.active;
    this.asistenciaService.toggleServiceStatus(service.id, newStatus).subscribe({
      next: (res) => {
        service.active = res;
        this.notificationService.success(`Servicio ${res ? 'activado' : 'desactivado'} correctamente`);
      }
    });
  }

  resetServiceForm() {
    this.serviceForm = { name: '', description: '' };
    this.isEditingService = false;
    this.editingServiceId = undefined;
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
