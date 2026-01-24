import { Component, inject, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.css'],
})
export class Topbar {
  @Output() toggleSidebar = new EventEmitter<void>();

  authService = inject(AuthService);

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }
}
