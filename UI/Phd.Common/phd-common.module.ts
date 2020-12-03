import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { TableModule } from 'primeng/table';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { OverlayPanelModule } from 'primeng/overlaypanel';

import { IPublicClientApplication, PublicClientApplication, InteractionType, BrowserCacheLocation, LogLevel } from '@azure/msal-browser';
import { MsalGuard, MsalInterceptor, MsalBroadcastService, MsalInterceptorConfiguration, MsalModule, MsalService, MSAL_GUARD_CONFIG, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';


import { PhdTableComponent } from './components/table/phd-table.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { SidePanelComponent } from './components/side-panel/side-panel.component';
import { PhdColumnDirective } from './components/table/phd-column.directive';
import { RowTogglerDirective } from './components/table/phd-rowtoggler.directive';
import { DragSourceDirective, DragTargetDirective, RequiresClaimDirective, ControlDisabledDirective } from './directives';
import { SpinnerInterceptor } from './services/interceptors/spinner.interceptor';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { BuildVersionComponent } from './components/build-version/build-version.component';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { ClaimGuard } from './guards/claim.guard';
import { IdentityService } from './services';
import { AuthInterceptor } from './http-interceptors/auth-interceptor';
import { SpinnerService } from './services/spinner.service';

export const API_URL = new InjectionToken<string>('apiUrl');

export function MSALInstanceFactory(config: any): IPublicClientApplication {
    return new PublicClientApplication(config);
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
    const protectedResourceMap = new Map<string, Array<string>>();
    //protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']);

    return {
        interactionType: InteractionType.Redirect,
        protectedResourceMap
    };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return { interactionType: InteractionType.Redirect };
}

@NgModule({
    imports: [TableModule, MultiSelectModule, DropdownModule, OverlayPanelModule, CommonModule, FormsModule, MsalModule],
    declarations: [PhdTableComponent, ConfirmModalComponent, SidePanelComponent, PhdColumnDirective, RowTogglerDirective, DragSourceDirective, DragTargetDirective, SpinnerComponent, RequiresClaimDirective, ControlDisabledDirective, BuildVersionComponent],
    exports: [PhdTableComponent, ConfirmModalComponent, SidePanelComponent, PhdColumnDirective, RowTogglerDirective, DragSourceDirective, DragTargetDirective, SpinnerComponent, RequiresClaimDirective, ControlDisabledDirective, BuildVersionComponent],
})
export class PhdCommonModule {
    static forRoot(msalConfig: any, apiUrl?: string, popupLogin: boolean = true): ModuleWithProviders {
        return {
            ngModule: PhdCommonModule,
            providers: [
                //{ provide: "AdalService", useClass: AdalService },
                CanDeactivateGuard,
                SpinnerService,
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: SpinnerInterceptor,
                    multi: true
                },
                { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
                { provide: API_URL, useValue: apiUrl || '' },
                {
                    provide: MSAL_INSTANCE,
                    useFactory: MSALInstanceFactory.bind(this, msalConfig)
                },
                {
                    provide: MSAL_GUARD_CONFIG,
                    useFactory: MSALGuardConfigFactory
                },
                {
                    provide: MSAL_INTERCEPTOR_CONFIG,
                    useFactory: MSALInterceptorConfigFactory
                },
                MsalService,
                MsalGuard,
                MsalBroadcastService,
                IdentityService,
                ClaimGuard,
                { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
            ]
        };
    }
}
