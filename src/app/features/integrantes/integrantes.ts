import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { IntegranteService } from '../../core/services/integrante';
import { Integrante } from '../../core/models/integrante.model';

@Component({
  selector: 'app-integrantes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './integrantes.html',
  styleUrl: './integrantes.css',
})
export class Integrantes implements OnInit {
  private fb = inject(FormBuilder);
  private integranteService = inject(IntegranteService);

  integrantes$: Observable<Integrante[]> = this.integranteService.getIntegrantes();
  integranteForm!: FormGroup;
  isEditing = false;
  currentId?: number;

  categorias = ['Damas', 'Caballeros', 'Jóvenes', 'Niños'];

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.integranteForm = this.fb.group({
      cedula: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      fechaNacimiento: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      categoria: ['', [Validators.required]],
      foto: ['']
    });
  }

  onSubmit() {
    if (this.integranteForm.valid) {
      if (this.isEditing && this.currentId) {
        this.integranteService.updateIntegrante(this.currentId, this.integranteForm.value);
      } else {
        this.integranteService.addIntegrante(this.integranteForm.value);
      }
      this.resetForm();
    }
  }

  editIntegrante(integrante: Integrante) {
    this.isEditing = true;
    this.currentId = integrante.id;
    this.integranteForm.patchValue(integrante);
  }

  deleteIntegrante(id: number) {
    if (confirm('¿Está seguro de eliminar este integrante?')) {
      this.integranteService.deleteIntegrante(id);
    }
  }

  resetForm() {
    this.isEditing = false;
    this.currentId = undefined;
    this.integranteForm.reset();
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
}
