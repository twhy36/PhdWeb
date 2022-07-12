import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {CoreModule} from '../core/core.module';
import {SharedModule} from '../shared/shared.module';

import {ColorsPageComponent} from './components/colors-page/colors-page.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule } from 'phd-common';
import { ColorsSearchHeaderComponent } from './components/search-header/colors-search-header.component';
import { AddColorDialogComponent } from './components/add-color-dialog/add-color-dialog.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { PickListModule } from 'primeng/picklist';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { EditColorSidePanelComponent } from './components/edit-color-side-panel/edit-color-side-panel.component';

const routes: Routes = [
	{
		path: 'color',
		children: [
		{
			path: '',  pathMatch: 'full', component: ColorsPageComponent
		}
	] }
];

@NgModule({
	declarations: [
		ColorsPageComponent,
		ColorsSearchHeaderComponent,
		AddColorDialogComponent,
		EditColorSidePanelComponent
	],
    imports: [
        NgbModule,
        CommonModule,
		FormsModule,
		ReactiveFormsModule,
        CoreModule,
        SharedModule,
		InfiniteScrollModule,
		PhdCommonModule,
		MultiSelectModule,
		PickListModule,
		ToastModule,
		CheckboxModule,
        RouterModule.forChild(routes)
    ],
	exports: [
	],
	providers: [
	]
})

export class ColorModule { }
