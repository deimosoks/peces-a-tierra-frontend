import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PwaService } from '../../core/services/pwa.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  authService = inject(AuthService);
  pwaService = inject(PwaService);

  close() {
    this.closeSidebar.emit();
  }

  logout() {
    this.authService.logout();
  }

  can(permission: string): boolean {
    return this.authService.can(permission);
  }

  installApp() {
    this.pwaService.addToHomeScreen();
  }
}
