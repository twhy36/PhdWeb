import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MaterialModule } from './material.module';
import { ToolbarComponent } from './components/home/toolbar/toolbar.component';
import { HomeComponent } from './components/home/home.component';
import { ContractService } from './services/contract.service';
import { API_URL, AUTH_CONFIG, IdentityService, WINDOW_ORIGIN } from './services/identity.service';
import { OrgService } from './services/org.service';
import { SettingsService } from './services/settings.service';
import { StorageService } from './services/storage.service';
import { MergeFieldAccordionComponent } from './components/home/merge-field-accordion/merge-field-accordion.component';
import { AccordionItemComponent } from './components/home/merge-field-accordion/accordion-item/accordion-item.component';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { OAuthModuleConfig, OAuthModule } from 'angular-oauth2-oidc';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInitializerFn = (identityService: IdentityService) =>
{
    // the APP_INITIALIZER provider waits for promises to be resolved
    return () => identityService.init().pipe(
        tap(loggedIn =>
        {
            if (!loggedIn)
            {
                identityService.login();
            }
        })
    ).toPromise();
};

export function oAuthModuleConfigFactory(apiUrl: string)
{
    return {
        resourceServer:
        {
            allowedUrls: [apiUrl], //URL of your API
            sendAccessToken: true
        }
    };
}

export function getOrigin()
{
    return window.origin;
}

const appInsights = new ApplicationInsights(
    {
        config:
        {
            connectionString: environment.appInsights.connectionString
        }
    });
appInsights.loadAppInsights();
appInsights.trackTrace({
    message: "Starting contract authoring tool"
});
appInsights.flush();

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        ToolbarComponent,
        MergeFieldAccordionComponent,
        AccordionItemComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        MaterialModule,
        FormsModule,
        HttpClientModule,
        OAuthModule.forRoot()
    ],
    providers: [
        { provide: WINDOW_ORIGIN, useFactory: getOrigin },
        { provide: ApplicationInsights, useValue: appInsights },
        { provide: AUTH_CONFIG, useValue: environment.authConfig },
        { provide: API_URL, useValue: environment.apiUrl },
        {
            provide: OAuthModuleConfig,
            useFactory: oAuthModuleConfigFactory,
            deps: [API_URL]
        },
        ContractService,
        IdentityService,
        OrgService,
        SettingsService,
        StorageService,
        { provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
