import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbButtonsModule } from '@ng-bootstrap/ng-bootstrap';
import {CoreModule} from '../core/core.module';
import {SharedModule} from '../shared/shared.module';

import {ColorAdminPageComponent} from './components/color-admin-page/color-admin-page.component';
import {ColorItemsPageComponent} from './components/color-items-page/color-items-page.component';
import {ColorsPageComponent} from './components/colors-page/colors-page.component';

const routes: Routes = [
	{ path: '', component: ColorAdminPageComponent }
];

@NgModule({
	declarations: [
		ColorAdminPageComponent,
		ColorItemsPageComponent,
		ColorsPageComponent
	],
    imports: [
        NgbModule,
        CommonModule,
        FormsModule,
        CoreModule,
        SharedModule,
        RouterModule.forChild(routes),
    ],
	exports: [
	],
	providers: [
	]
})

export class ColorAdminModule { }
