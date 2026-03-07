import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container';
import { ConfirmationModalComponent } from './shared/components/confirmation-modal/confirmation-modal';
import { GoogleMapsService } from './core/services/google-maps.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ConfirmationModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('icc-tda-frontend');
  private googleMapsService = inject(GoogleMapsService);

  ngOnInit() {
    this.googleMapsService.load()
      .catch(err => console.error('App failed to load Google Maps', err));
  }
}
