import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceEventService } from '../../../core/services/service-event.service';
import { AsistenciaService } from '../../../core/services/asistencia';
import { BranchService } from '../../../core/services/branch.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceEvent, ServiceEventsFilterRequestDto } from '../../../core/models/service-event.model';
import { IglesiaService } from '../../../core/models/asistencia.model';
import { Branch } from '../../../core/models/branch.model';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: ServiceEvent[];
}

@Component({
  selector: 'app-service-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-calendar.component.html',
  styleUrls: ['./service-calendar.component.css']
})
export class ServiceCalendarComponent implements OnInit {
  private eventService = inject(ServiceEventService);
  private asistenciaService = inject(AsistenciaService);
  private branchService = inject(BranchService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  @Input() isAdmin: boolean = false;
  @Input() isSelectionMode: boolean = false;
  @Input() canCreate: boolean = false;

  @Output() eventSelected = new EventEmitter<ServiceEvent>();
  @Output() eventAction = new EventEmitter<ServiceEvent>(); // For cancel/delete in management mode
  @Output() createEvent = new EventEmitter<void>();
  @Output() daySelected = new EventEmitter<string>();

  // Calendar State
  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays: string[] = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // Filters
  selectedBranchId: string = '';
  selectedServiceId: string = '';
  
  // Data
  events: ServiceEvent[] = [];
  services: IglesiaService[] = [];
  branches: Branch[] = [];

  // State
  isLoading = true;

  ngOnInit() {
    this.generateCalendar();
    this.loadServices();

    if (this.isAdmin) {
      this.loadBranches();
    }

    if (!this.isAdmin) {
         const user = this.authService.currentUser();
         this.selectedBranchId = user?.branchId || user?.memberResponseDto?.branch?.id || '';
    }
  }

  // --- Calendar Logic ---

  get currentMonthLabel(): string {
    return this.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.generateCalendar();
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(lastDay);
    if (endDate.getDay() < 6) {
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    }
    endDate.setHours(23, 59, 59, 999);

    const days: CalendarDay[] = [];
    let loopDate = new Date(startDate);
    
    while (loopDate <= endDate) {
        days.push({
            date: new Date(loopDate),
            isCurrentMonth: loopDate.getMonth() === month,
            isToday: this.isSameDate(loopDate, new Date()),
            events: []
        });
        loopDate.setDate(loopDate.getDate() + 1);
    }
    
    this.calendarDays = days;
    this.loadEvents(startDate, endDate);
  }

  isSameDate(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }

  onFilterChange() {
    this.generateCalendar();
  }

  refresh() {
    this.generateCalendar();
  }

  // --- Data Loading ---

  loadEvents(start: Date, end: Date) {
    this.isLoading = true;
    
    const filter: ServiceEventsFilterRequestDto = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        branchId: this.selectedBranchId || undefined,
        serviceId: this.selectedServiceId || undefined
    };

    this.eventService.findAll(filter).subscribe({
      next: (data) => {
        this.events = data || [];
        this.mapEventsToDays();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading events', err);
        this.isLoading = false;
        this.notificationService.error('Error al cargar los eventos');
      }
    });
  }

  mapEventsToDays() {
    this.calendarDays.forEach(d => d.events = []);
    this.events.forEach(event => {
        const eventDate = new Date(event.startDateTime);
        const day = this.calendarDays.find(d => this.isSameDate(d.date, eventDate));
        if (day) {
            day.events.push(event);
        }
    });
    
    this.calendarDays.forEach(day => {
        day.events.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
    });
  }

  loadServices() {
    this.asistenciaService.getServices(true).subscribe(data => this.services = data);
  }

  loadBranches() {
    this.branchService.findAll().subscribe(data => this.branches = data);
  }

  // --- Interactions ---

  isFutureEvent(event: ServiceEvent): boolean {
    return new Date(event.startDateTime) > new Date();
  }

  onEventClick(event: ServiceEvent, mouseEvent: MouseEvent) {
    mouseEvent.stopPropagation();
    // Only block future events if we are in selection mode (Attendance)
    if (this.isSelectionMode && this.isFutureEvent(event)) {
        return;
    }

    if (this.isSelectionMode) {
      this.eventSelected.emit(event);
    } else {
      this.eventAction.emit(event);
    }
  }

  onCreateClick() {
    this.createEvent.emit();
  }

  onDayClick(day: CalendarDay) {
    if (!this.isSelectionMode && this.canCreate) {
      const year = day.date.getFullYear();
      const month = String(day.date.getMonth() + 1).padStart(2, '0');
      const date = String(day.date.getDate()).padStart(2, '0');
      this.daySelected.emit(`${year}-${month}-${date}`);
    }
  }
}
