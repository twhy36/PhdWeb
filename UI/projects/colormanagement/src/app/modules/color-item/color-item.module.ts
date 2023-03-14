import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ColorItemRoutingModule } from './color-item-routing.module';
import {ColorItemsPageComponent} from '../color-item/components/color-items-page/color-items-page.component';
import { ColorItemsSearchHeaderComponent } from './components/item-search-header/color-items-search-header.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule } from 'phd-common';
import { SharedModule } from 'primeng/api';
import { CoreModule } from '../core/core.module';
import { MultiSelectModule } from 'primeng/multiselect';
import { AddColorItemDialogComponent } from './components/add-color-item-dialog/add-color-item-dialog.component';
import { EditColorItemDialogComponent } from './components/edit-color-item-dialog/edit-color-item-dialog.component';
import { PickListModule } from 'primeng/picklist';
import { ToastModule } from 'primeng/toast';

@NgModule({
	declarations: [
		ColorItemsPageComponent,
		ColorItemsSearchHeaderComponent,
		AddColorItemDialogComponent,
		EditColorItemDialogComponent
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
		ColorItemRoutingModule
	]
})
export class ColorItemModule { }
