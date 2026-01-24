import { Directive, EventEmitter, HostListener, Input, Output, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { Subject, Subscription, timer } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Directive({
  selector: '[appSafeClick]',
  standalone: true
})
export class SafeClickDirective implements OnDestroy {
  private _throttleDelay = 600;
  
  @Input('appSafeClick') set throttleDelay(value: number | string) {
    if (value === '') return; 
    this._throttleDelay = typeof value === 'string' ? parseInt(value, 10) || 600 : value;
  }
  get throttleDelay(): number { return this._throttleDelay; }
  
  @Output() safeClick = new EventEmitter<Event>();

  private clicks = new Subject<Event>();
  private subscription: Subscription;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.subscription = this.clicks.pipe(
      throttleTime(600) // Usamos 600 por defecto para evitar problemas de timing inicial
    ).subscribe(event => {
      this.safeClick.emit(event);
      this.applyFeedback();
    });
  }

  @HostListener('click', ['$event'])
  clickEvent(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.clicks.next(event);
  }

  private applyFeedback() {
    this.renderer.setStyle(this.el.nativeElement, 'opacity', '0.6');
    this.renderer.setStyle(this.el.nativeElement, 'pointer-events', 'none');
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'not-allowed');

    timer(this.throttleDelay).subscribe(() => {
      this.renderer.removeStyle(this.el.nativeElement, 'opacity');
      this.renderer.removeStyle(this.el.nativeElement, 'pointer-events');
      this.renderer.removeStyle(this.el.nativeElement, 'cursor');
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
