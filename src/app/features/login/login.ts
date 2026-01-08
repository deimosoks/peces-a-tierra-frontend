import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})
export class Login {
    loginData = {
        email: '',
        password: ''
    };

    showPassword = false;
    isLoading = false;
    errorMessage = '';

    constructor(private router: Router) { }

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

        // Mock authentication for now
        setTimeout(() => {
            this.isLoading = false;
            // In a real app, we would validate with a service here
            if (this.loginData.email === 'usuario@icctba.com' && this.loginData.password === '123456') {
                localStorage.setItem('isLoggedIn', 'true');
                this.router.navigate(['/dashboard']);
            } else {
                this.errorMessage = 'Credenciales inválidas. Intente de nuevo.';
            }
        }, 1500);
    }
}
