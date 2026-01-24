import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private deferredPrompt: any;
  showInstallButton = false;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      this.deferredPrompt = e;
      // Update UI notify the user they can install the PWA
      this.showInstallButton = true;
      console.log('beforeinstallprompt fired. PWA install is available.');
    });

    window.addEventListener('appinstalled', () => {
      this.showInstallButton = false;
      this.deferredPrompt = null;
      console.log('PWA was installed');
    });
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
  }

  addToHomeScreen() {
    if (!this.deferredPrompt) {
      console.log('Installation prompt not available');
      return;
    }
    // Show the install prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        this.showInstallButton = false;
      } else {
        console.log('User dismissed the install prompt');
      }
      this.deferredPrompt = null;
    });
  }
}
