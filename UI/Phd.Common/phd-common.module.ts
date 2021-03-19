import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TableModule } from 'primeng/table';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { OverlayPanelModule } from 'primeng/overlaypanel';

import { AdalService } from 'adal-angular4';

import { PhdTableComponent } from './components/table/phd-table.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { SidePanelComponent } from './components/side-panel/side-panel.component';
import { PhdColumnDirective } from './components/table/phd-column.directive';
import { RowTogglerDirective } from './components/table/phd-rowtoggler.directive';
import { DragSourceDirective, DragTargetDirective, RequiresClaimDirective, ControlDisabledDirective } from './directives';
import { SpinnerInterceptor } from './services/interceptors/spinner.interceptor';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { BuildVersionComponent } from './components/build-version/build-version.component';
import { ErrorMessageComponent } from './components/error-message/error-message.component';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { ClaimGuard } from './guards/claim.guard';
import { IdentityService, IdentitySettings } from './services';
import { AuthInterceptor } from './http-interceptors/auth-interceptor';
import { SpinnerService } from './services/spinner.service';
import { BrowserService } from './services/browser.service';
import { EllipsisPipe } from './pipes/ellipsis.pipe';

export const API_URL = new InjectionToken<string>('apiUrl');

@NgModule({
    imports: [
        TableModule,
        MultiSelectModule,
        DropdownModule,
        OverlayPanelModule,
        CommonModule,
        FormsModule,
        BrowserAnimationsModule],
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
    static forRoot(settings: IdentitySettings, apiUrl?: string): ModuleWithProviders {
        return {
            ngModule: PhdCommonModule,
            providers: [
                { provide: "AdalService", useClass: AdalService },
                CanDeactivateGuard,
                SpinnerService,
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: SpinnerInterceptor,
                    multi: true
                },
                { provide: IdentitySettings, useValue: settings },
                { provide: API_URL, useValue: apiUrl || '' },
                IdentityService,
                BrowserService,
                ClaimGuard,
                { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
            ]
        };
    }
}
