import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntegranteService } from '../../core/services/integrante';
import { AsistenciaService } from '../../core/services/asistencia';
import { Observable, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  private integranteService = inject(IntegranteService);
  private asistenciaService = inject(AsistenciaService);

  stats$: Observable<any> = combineLatest([
    this.integranteService.getIntegrantes(),
    // For MVP, we'll just use counts from the member list to create cat-based stats
  ]).pipe(
    map(([integrantes]) => {
      const counts = integrantes.reduce((acc: any, curr) => {
        acc[curr.categoria] = (acc[curr.categoria] || 0) + 1;
        return acc;
      }, {});

      return {
        total: integrantes.length,
        damas: counts['Damas'] || 0,
        caballeros: counts['Caballeros'] || 0,
        jovenes: counts['Jóvenes'] || 0,
        ninos: counts['Niños'] || 0,
      };
    })
  );

  ngOnInit() { }

  downloadReport() {
    alert('Generando PDF del reporte de integrantes y asistencia...');
    // Real export logic would go here
  }
}
