import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule, NgbButtonsModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectModule } from 'primeng/multiselect';

import { PhdCommonModule } from 'phd-common';

import { CapitalCaseSpacePipe } from './pipes/capitalCaseSpace.pipe';
import { UnauthorizedComponent} from './components/unauthorized/unauthorized.component';
import { CoreModule } from '../core/core.module';
import { SidePanelComponent } from './components/side-panel/side-panel.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';


const routes: Routes = [
	{ path: 'unauthorized', component: UnauthorizedComponent }
];

@NgModule({
	declarations: [
		UnauthorizedComponent,
		CapitalCaseSpacePipe,
  SidePanelComponent,
  ConfirmModalComponent
	],
	imports: [
		BrowserAnimationsModule,
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		MultiSelectModule,
		NgbButtonsModule,
		NgbModule,
		RouterModule.forChild(routes),
		PhdCommonModule,
		CoreModule
	],
	exports: [
		UnauthorizedComponent,
		CapitalCaseSpacePipe
	],
	providers: [
	]
})

export class SharedModule { }
