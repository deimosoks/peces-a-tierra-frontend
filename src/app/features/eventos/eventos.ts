import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiceEventService } from '../../core/services/service-event.service';
import { AsistenciaService } from '../../core/services/asistencia';
import { BranchService } from '../../core/services/branch.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { AuthService } from '../../core/services/auth.service';
import { ServiceEvent, ServiceEventRequestDto } from '../../core/models/service-event.model';
import { IglesiaService } from '../../core/models/asistencia.model';
import { Branch } from '../../core/models/branch.model';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  // Data
  events: ServiceEvent[] = [];
  upcomingEvents: ServiceEvent[] = [];
  pastEvents: ServiceEvent[] = [];
  services: IglesiaService[] = [];
  branches: Branch[] = [];

  // State
  isLoading = true;
  isSaving = false;
  showModal = false;

  // Permissions
  canCreate = false;
  canCancel = false;

  isAdmin = false;
  currentUserBranchId?: string;
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      serviceId: ['', Validators.required],
      branchId: [''], // Validator added dynamically based on role
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      startTime: ['08:00', Validators.required],
      endTime: ['10:00', Validators.required]
    });
  }

  ngOnInit() {
    this.checkPermissions();
    
    // Add validator if admin
    if (this.isAdmin) {
        this.form.get('branchId')?.addValidators(Validators.required);
    }

    this.loadEvents();
    
    if (this.canCreate) {
      this.loadServices();
      if (this.isAdmin) {
          this.loadBranches();
      } else {
          // If not admin, try to set branch from user info
          const user = this.authService.currentUser();
          if (user?.branchId) {
              this.currentUserBranchId = user.branchId;
              this.form.patchValue({ branchId: this.currentUserBranchId });
          } else if (user?.memberResponseDto?.branch?.id) {
              // Fallback to memberResponseDto if branchId is not directly on user
              this.currentUserBranchId = user.memberResponseDto.branch.id;
              this.form.patchValue({ branchId: this.currentUserBranchId });
          } else {
              console.warn('Could not find branch for current user');
          }
      }
    }
  }

  checkPermissions() {
    this.canCreate = this.authService.can('REGISTER_EVENTS');
    this.canCancel = this.authService.can('CANCEL_EVENTS');
    this.isAdmin = this.authService.can('ADMINISTRATOR');
  }

  loadEvents() {
    this.isLoading = true;
    this.eventService.findAll().subscribe({
      next: (data) => {
        this.events = data;
        
        const now = new Date();
        
        this.upcomingEvents = data
            .filter(e => new Date(e.endDateTime) >= now)
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
            
        this.pastEvents = data
            .filter(e => new Date(e.endDateTime) < now)
            .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading events', err);
        this.isLoading = false;
        this.notificationService.error('Error al cargar los eventos');
      }
    });
  }

  loadServices() {
    this.asistenciaService.getServices(true).subscribe({
      next: (data) => {
        this.services = data;
      },
      error: (err) => {
        console.error('Error loading services', err);
      }
    });
  }

  loadBranches() {
    this.branchService.findAll().subscribe({
      next: (data) => {
        this.branches = data;
      },
      error: (err) => {
        console.error('Error loading branches', err);
      }
    });
  }

  openModal() {
    this.form.reset({
      serviceId: '',
      branchId: this.isAdmin ? '' : (this.currentUserBranchId || ''),
      date: new Date().toISOString().substring(0, 10),
      startTime: '08:00',
      endTime: '10:00'
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.form.reset();
    this.isSaving = false;
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    
    this.isSaving = true;
    const formValue = this.form.value;
    
    // Combine date + time
    const startDateTime = `${formValue.date}T${formValue.startTime}:00`;
    const endDateTime = `${formValue.date}T${formValue.endTime}:00`;

    const dto: ServiceEventRequestDto = {
        serviceId: formValue.serviceId,
        branchId: formValue.branchId,
        startDateTime: startDateTime,
        endDateTime: endDateTime
    };
    
    this.eventService.create(dto).subscribe({
      next: () => {
        this.notificationService.success('Evento creado correctamente');
        this.loadEvents();
        this.closeModal();
      },
      error: (err) => {
        console.error('Error saving event', err);
        this.notificationService.error('Error al crear el evento');
        this.isSaving = false;
      }
    });
  }

  async cancelEvent(event: ServiceEvent) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Cancelar/Finalizar Evento',
      message: `¿Estás seguro de cancelar o finalizar el evento de ${event.serviceName} en ${event.branchName}?`,
      type: 'danger',
      confirmText: 'Confirmar'
    });

    if (confirmed) {
      this.eventService.cancelEvent(event.id).subscribe({
        next: () => {
          this.notificationService.success('Evento actualizado correctamente');
          this.loadEvents();
        },
        error: (err: any) => {
          console.error('Error cancelling event', err);
          this.notificationService.error('Error al cancelar el evento');
        }
      });
    }
  }
}

