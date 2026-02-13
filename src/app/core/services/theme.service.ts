import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'theme-preference';
  isDarkMode = signal<boolean>(this.loadTheme());

  constructor() {
    // Apply theme whenever signal changes
    effect(() => {
      this.applyTheme(this.isDarkMode());
    });
  }

  toggleTheme() {
    this.isDarkMode.update(dark => !dark);
    localStorage.setItem(this.THEME_KEY, JSON.stringify(this.isDarkMode()));
  }

  private loadTheme(): boolean {
    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored !== null) {
      return JSON.parse(stored);
    }
    // Default to light mode as requested
    return false;
  }

  private applyTheme(isDark: boolean) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}
