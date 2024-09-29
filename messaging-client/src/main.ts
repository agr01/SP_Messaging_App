import { bootstrapApplication, DomSanitizer } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { CustomSanitizationService } from './app/services/custom-sanitization.service';

bootstrapApplication(AppComponent, {
  providers: [
    {provide: DomSanitizer, useClass: CustomSanitizationService}
  ]
}).catch((err) => console.error(err));
