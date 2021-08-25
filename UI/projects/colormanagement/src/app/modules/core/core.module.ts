import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from './services/organization.service';
import { StorageService } from './services/storage.service';
import { ColorService } from './services/color.service';
import { AccessGuard } from './services/access.guard';
import { MarketSelectorComponent } from './components/market-selector/market-selector.component';
import { ColorsSearchHeaderComponent } from './components/search-header/colors-search-header.component';
import { OptionService } from './services/option.service';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule } from 'phd-common';
import { SidePanelComponent } from '../shared/components/side-panel/side-panel.component';
import { ConfirmModalComponent } from '../shared/components/confirm-modal/confirm-modal.component';

import { SettingsService } from './services/settings.service';
import { ModalComponent } from './components/modal/modal.component';
import { ModalService } from './services/modal.service';
import { MatDialogModule  } from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
@NgModule({
	declarations: [
		MarketSelectorComponent,
		ColorsSearchHeaderComponent,
		SidePanelComponent,
		ConfirmModalComponent,
		SidePanelComponent,
		ConfirmModalComponent,
		ModalComponent,

	],
    imports: [
        CommonModule,
        FormsModule,
        InfiniteScrollModule,
        PhdCommonModule,
        MatDialogModule,
        MatButtonModule,
    ],
	exports: [
		MarketSelectorComponent,
		ColorsSearchHeaderComponent,
		SidePanelComponent,
		ConfirmModalComponent,
	],
	providers: [
		OrganizationService,
		StorageService,
		AccessGuard,
		OptionService,
		ColorService,
		SettingsService,
		ModalService,
	]
})

export class CoreModule { }
