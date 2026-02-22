import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PwaService } from '../../core/services/pwa.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, ReactiveFormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);
  pwaService = inject(PwaService);

  // Change Password Modal
  showChangePasswordModal = false;
  isSavingPassword = false;
  changePasswordForm: FormGroup;

  constructor() {
    this.changePasswordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

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

  openChangePasswordModal() {
    this.changePasswordForm.reset();
    this.showChangePasswordModal = true;
    if (window.innerWidth < 1024) {
      this.close();
    }
  }

  closeChangePasswordModal() {
    this.showChangePasswordModal = false;
    this.isSavingPassword = false;
  }

  onSubmitChangePassword() {
    if (this.changePasswordForm.invalid) {
      this.notificationService.error('Por favor, verifique los campos');
      return;
    }

    this.isSavingPassword = true;
    this.authService.changgePassword(this.changePasswordForm.value).subscribe({
      next: () => {
        this.notificationService.success('Contraseña actualizada exitosamente');
        this.closeChangePasswordModal();
      },
      error: (err) => {
        console.error('Error changing password:', err);
        this.isSavingPassword = false;
      }
    });
  }
}
