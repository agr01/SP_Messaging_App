import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeStyle, SafeScript, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class CustomSanitizationService extends DomSanitizer {
  constructor() {
    super();
  }

  bypassSecurityTrustHtml(value: string): SafeHtml {
    return value as any;
  }

  bypassSecurityTrustStyle(value: string): SafeStyle {
    return value as any;
  }

  bypassSecurityTrustScript(value: string): SafeScript {
    return value as any;
  }

  bypassSecurityTrustUrl(value: string): SafeUrl {
    return value as any;
  }

  bypassSecurityTrustResourceUrl(value: string): SafeResourceUrl {
    return value as any;
  }

  sanitize(context: any, value: string | null): string | null {

    return value;
  }
}
