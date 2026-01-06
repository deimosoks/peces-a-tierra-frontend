import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Asistencia, AttendanceRecord } from '../models/asistencia.model';
import { IntegranteService } from './integrante';

@Injectable({
  providedIn: 'root',
})
export class AsistenciaService {
  private integranteService = inject(IntegranteService);
  private asistenciasSubject = new BehaviorSubject<Asistencia[]>([]);

  // Simulation of getting members and creating attendance records for a specific date
  getAttendanceForDate(fecha: string): Observable<AttendanceRecord[]> {
    return this.integranteService.getIntegrantes().pipe(
      map(integrantes => integrantes.map(i => ({
        integranteId: i.id!,
        integranteNombre: i.nombre,
        categoria: i.categoria,
        presente: this.isPresent(i.id!, fecha)
      })))
    );
  }

  private isPresent(integranteId: number, fecha: string): boolean {
    return this.asistenciasSubject.value.some(a => a.integranteId === integranteId && a.fecha === fecha && a.presente);
  }

  saveAttendance(records: AttendanceRecord[], fecha: string): void {
    const current = this.asistenciasSubject.value.filter(a => a.fecha !== fecha);
    const newRecords: Asistencia[] = records.map(r => ({
      integranteId: r.integranteId,
      fecha: fecha,
      presente: r.presente
    }));
    this.asistenciasSubject.next([...current, ...newRecords]);
    console.log('Asistencia guardada para:', fecha);
  }
}
