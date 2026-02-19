import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ServiceEventService } from '../../core/services/service-event.service';
import { AsistenciaService } from '../../core/services/asistencia';
import { BranchService } from '../../core/services/branch.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { AuthService } from '../../core/services/auth.service';
import { ServiceEvent } from '../../core/models/service-event.model';
import { IglesiaService } from '../../core/models/asistencia.model';
import { Branch } from '../../core/models/branch.model';
import { ServiceCalendarComponent } from '../../shared/components/service-calendar/service-calendar.component';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ServiceCalendarComponent],
  templateUrl: './eventos.html',
  styleUrl: './eventos.css'
})
export class Eventos implements OnInit {
  private fb = inject(FormBuilder);
  private eventService = inject(ServiceEventService);
  private asistenciaService = inject(AsistenciaService);
  private branchService = inject(BranchService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(AuthService);

  @ViewChild(ServiceCalendarComponent) calendarComponent!: ServiceCalendarComponent;

  // Data needed for Form
  services: IglesiaService[] = [];
  branches: Branch[] = [];

  // State
  isSaving = false;
  showModal = false;

  // Permissions
  canCreate = false;
  canCancel = false;
  isAdmin = false;
  
  currentUserBranchId: string = '';

  // Forms
  form: FormGroup;
  minDate: string = new Date().toISOString().split('T')[0];

  constructor() {
    this.form = this.fb.group({
      serviceId: ['', Validators.required],
      branchId: [''], 
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      startTime: ['08:00', Validators.required],
      endTime: ['10:00', Validators.required]
    });
  }

  ngOnInit() {
    this.checkPermissions();
    
    // Set validation for branchId if admin
    if (this.isAdmin) {
        this.form.get('branchId')?.addValidators(Validators.required);
    }
    
    // Load data for form
    this.loadServices();

    if (this.isAdmin) {
      this.loadBranches(); 
    }

    if (!this.isAdmin) {
         const user = this.authService.currentUser();
         this.currentUserBranchId = user?.branchId || user?.memberResponseDto?.branch?.id || '';
    }
  }

  checkPermissions() {
    this.canCreate = this.authService.can('REGISTER_EVENTS');
    this.canCancel = this.authService.can('CANCEL_EVENTS');
    this.isAdmin = this.authService.can('ADMINISTRATOR');
  }

  loadServices() {
    this.asistenciaService.getServices(true).subscribe(data => this.services = data);
  }

  loadBranches() {
    this.branchService.findAll().subscribe(data => this.branches = data);
  }

  // --- Actions forwarded from Child ---

  openModal() {
    this.form.reset({
      serviceId: '',
      branchId: this.isAdmin ? '' : (this.currentUserBranchId || ''),
      date: new Date().toISOString().substring(0, 10),
      startTime: '08:00',
      endTime: '10:00'
    });
    
    if (!this.isAdmin && this.currentUserBranchId) {
         this.form.patchValue({ branchId: this.currentUserBranchId });
    }
    
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.form.reset();
    this.isSaving = false;
  }

  save() {
    if (this.form.invalid || this.isSaving) {
        this.form.markAllAsTouched();
        return;
    }
    
    this.isSaving = true;
    const formValue = this.form.value;
    
    const startDateTime = `${formValue.date}T${formValue.startTime}:00`;
    const endDateTime = `${formValue.date}T${formValue.endTime}:00`;

    const dto: any = { 
        serviceId: formValue.serviceId,
        branchId: formValue.branchId,
        startDateTime: startDateTime,
        endDateTime: endDateTime
    };
    
    this.eventService.create(dto).subscribe({
      next: () => {
        this.notificationService.success('Evento creado correctamente');
        if (this.calendarComponent) {
            this.calendarComponent.refresh();
        }
        this.closeModal();
      },
      error: (err: any) => {
        console.error('Error saving event', err);
        this.notificationService.error(err.error?.message || 'Error al crear el evento');
        this.isSaving = false;
      }
    });
  }

  async cancelEvent(event: ServiceEvent) {
    if (!this.canCancel) return;
    
    const confirmed = await this.confirmationService.confirm({
      title: 'Cancelar/Finalizar Evento',
      message: `¿Estás seguro de cancelar o finalizar el evento de ${event.serviceName}?`,
      type: 'danger',
      confirmText: 'Sí, Cancelar'
    });

    if (confirmed) {
      this.eventService.cancelEvent(event.id).subscribe({
        next: () => {
          this.notificationService.success('Evento cancelado');
          if (this.calendarComponent) {
            this.calendarComponent.refresh();
          }
        },
        error: (err: any) => {
          this.notificationService.error('Error al cancelar el evento');
        }
      });
    }
  }
}
