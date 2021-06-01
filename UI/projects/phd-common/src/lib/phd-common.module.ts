import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TableModule } from 'primeng/table';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { OverlayPanelModule } from 'primeng/overlaypanel';

import { OAuthModule, OAuthModuleConfig, AuthConfig } from 'angular-oauth2-oidc';

import { API_URL, WINDOW_ORIGIN } from './injection-tokens';
import { PhdTableComponent } from './components/table/phd-table.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { SidePanelComponent } from './components/side-panel/side-panel.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { BuildVersionComponent } from './components/build-version/build-version.component';
import { ErrorMessageComponent } from './components/error-message/error-message.component';
import { PhdColumnDirective } from './components/table/phd-column.directive';
import { RowTogglerDirective } from './components/table/phd-rowtoggler.directive';
import { DragSourceDirective } from './directives/drag-source.directive';
import { DragTargetDirective } from './directives/drag-target.directive';
import { RequiresClaimDirective } from './directives/requires-claim.directive';
import { ControlDisabledDirective } from './directives/control-disabled.directive';
import { SpinnerInterceptor } from './services/interceptors/spinner.interceptor';
import { AuthInterceptor } from './http-interceptors/auth-interceptor';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { ClaimGuard } from './guards/claim.guard';
import { IdentityService } from './services/identity.service';
import { SpinnerService } from './services/spinner.service';
import { BrowserService } from './services/browser.service';
import { EllipsisPipe } from './pipes/ellipsis.pipe';

export function oAuthModuleConfigFactory(apiUrl: string) {
    return {
        resourceServer:
        {
            allowedUrls: [apiUrl], //URL of your API
            sendAccessToken: true
        }
    };
}

export function getOrigin() {
	return window.origin;
}

@NgModule({
    imports: [
		TableModule,
		MultiSelectModule,
		DropdownModule,
		OverlayPanelModule,
		CommonModule,
		FormsModule,
		BrowserAnimationsModule,
		HttpClientModule,
		OAuthModule.forRoot()
	],
    declarations: [
		PhdTableComponent,
		ConfirmModalComponent,
		SidePanelComponent,
		PhdColumnDirective,
		RowTogglerDirective,
		DragSourceDirective,
		DragTargetDirective,
		SpinnerComponent,
		RequiresClaimDirective,
		ControlDisabledDirective,
		BuildVersionComponent,
		ErrorMessageComponent,
        EllipsisPipe
	],
    exports: [
		PhdTableComponent,
		ConfirmModalComponent,
		SidePanelComponent,
		PhdColumnDirective,
		RowTogglerDirective,
		DragSourceDirective,
		DragTargetDirective,
		SpinnerComponent,
		RequiresClaimDirective,
		ControlDisabledDirective,
		BuildVersionComponent,
        ErrorMessageComponent,
        EllipsisPipe
	],
})
export class PhdCommonModule {
    static forRoot(apiUrl?: string): ModuleWithProviders<PhdCommonModule> {
        return {
            ngModule: PhdCommonModule,
            providers: [
                CanDeactivateGuard,
                SpinnerService,
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: SpinnerInterceptor,
                    multi: true
                },
				{ provide: WINDOW_ORIGIN, useFactory: getOrigin },
				{ provide: API_URL, useValue: apiUrl },
                {
                    provide: OAuthModuleConfig,
                    useFactory: oAuthModuleConfigFactory,
                    deps: [API_URL]
                },
                IdentityService,
				BrowserService,
                ClaimGuard
            ]
        };
    }
}
