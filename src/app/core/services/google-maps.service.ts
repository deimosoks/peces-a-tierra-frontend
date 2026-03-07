import { Injectable } from '@angular/core';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private isLoaded = false;

  load(): Promise<void> {
    if (this.isLoaded || typeof google !== 'undefined') {
      this.isLoaded = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = (error: any) => {
        console.error('Error loading Google Maps API:', error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }

  isApiLoaded(): boolean {
    return this.isLoaded || typeof google !== 'undefined';
  }
}

declare var google: any;
