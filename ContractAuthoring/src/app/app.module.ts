import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MaterialModule } from './material.module';
import { ToolbarComponent } from './components/home/toolbar/toolbar.component';
import { HomeComponent } from './components/home/home.component';
import { ContractService } from './services/contract.service';
import { IdentityService } from './services/identity.service';
import { OrgService } from './services/org.service';
import { SettingsService } from './services/settings.service';
import { StorageService } from './services/storage.service';
import { AuthInterceptor } from './services/interceptors/auth-interceptor.service';
import { MergeFieldAccordionComponent } from './components/home/merge-field-accordion/merge-field-accordion.component';
import { AccordionItemComponent } from './components/home/merge-field-accordion/accordion-item/accordion-item.component';

const appInitializerFn = (identityService: IdentityService) => {
  return () => identityService.init();
};

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: '**', component: HomeComponent }
];

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
    RouterModule.forRoot(routes)
  ],
  providers: [
    ContractService,
    IdentityService,
    OrgService,
    SettingsService,
    StorageService,
    { provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
