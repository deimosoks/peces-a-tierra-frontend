import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})
export class Login {
    currentYear = new Date().getFullYear();

    private authService = inject(AuthService);
    private router = inject(Router);

    loginData = {
        email: '',
        password: ''
    };

    showPassword = false;
    isLoading = false;
    errorMessage = '';

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    onSubmit() {
        if (!this.loginData.email || !this.loginData.password) {
            this.errorMessage = 'Por favor, complete todos los campos.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.authService.login({
            username: this.loginData.email,
            password: this.loginData.password
        }).subscribe({
            next: () => {
                this.router.navigate(['/dashboard']);
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Login failed', err);
                this.isLoading = false;
                if (err.status === 401 || err.status === 403) {
                    this.errorMessage = 'Credenciales inválidas. Intente de nuevo.';
                } else {
                    this.errorMessage = 'Ocurrió un error al iniciar sesión. Inténtelo más tarde.';
                }
            }
        });
    }
}
