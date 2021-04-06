import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { IdentityService } from 'phd-common/services';

if (environment.production) {
  enableProdMode();
}

if (!window.frameElement) {
	platformBrowserDynamic().bootstrapModule(AppModule)
	  .catch(err => console.log(err));
} else {
	IdentityService.handleWindowCallback();
}
