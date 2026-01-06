import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenciaService } from '../../core/services/asistencia';
import { AttendanceRecord } from '../../core/models/asistencia.model';
import { Observable, tap } from 'rxjs';

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.css',
})
export class Asistencia implements OnInit {
  private asistenciaService = inject(AsistenciaService);

  fecha: string = new Date().toISOString().split('T')[0];
  records: AttendanceRecord[] = [];
  isLoading = false;

  ngOnInit() {
    this.loadAttendance();
  }

  loadAttendance() {
    this.isLoading = true;
    this.asistenciaService.getAttendanceForDate(this.fecha).subscribe(data => {
      this.records = data;
      this.isLoading = false;
    });
  }

  save() {
    this.asistenciaService.saveAttendance(this.records, this.fecha);
    alert('Asistencia guardada exitosamente');
  }

  getBadgeClass(categoria: string): string {
    switch (categoria) {
      case 'Damas': return 'badge-damas';
      case 'Caballeros': return 'badge-caballeros';
      case 'Jóvenes': return 'badge-jovenes';
      case 'Niños': return 'badge-ninos';
      default: return '';
    }
  }

  getTotalPresente(): number {
    return this.records.filter(r => r.presente).length;
  }
}
