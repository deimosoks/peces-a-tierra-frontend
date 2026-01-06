import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Integrante } from '../models/integrante.model';

@Injectable({
  providedIn: 'root',
})
export class IntegranteService {
  private integrantesSubject = new BehaviorSubject<Integrante[]>([
    {
      id: 1,
      cedula: 'V-12.345.678',
      nombre: 'María Rodriguez',
      telefono: '0412-9876543',
      categoria: 'Damas',
      direccion: 'Calle Principal, Sector 1',
      fechaNacimiento: '1990-05-15'
    },
    {
      id: 2,
      cedula: 'V-9.876.543',
      nombre: 'Carlos Gómez',
      telefono: '0416-1234567',
      categoria: 'Caballeros',
      direccion: 'Av. Las Palmas, Edif. A',
      fechaNacimiento: '1985-11-20'
    }
  ]);

  getIntegrantes(): Observable<Integrante[]> {
    return this.integrantesSubject.asObservable();
  }

  addIntegrante(integrante: Integrante): void {
    const current = this.integrantesSubject.value;
    const nextId = current.length > 0 ? Math.max(...current.map(i => i.id || 0)) + 1 : 1;
    this.integrantesSubject.next([...current, { ...integrante, id: nextId }]);
  }

  updateIntegrante(id: number, updated: Integrante): void {
    const current = this.integrantesSubject.value;
    const index = current.findIndex(i => i.id === id);
    if (index !== -1) {
      current[index] = { ...updated, id };
      this.integrantesSubject.next([...current]);
    }
  }

  deleteIntegrante(id: number): void {
    const current = this.integrantesSubject.value;
    this.integrantesSubject.next(current.filter(i => i.id !== id));
  }
}
