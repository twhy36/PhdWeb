import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PageHeaderComponent } from './components/page-header/page-header.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';

import { HandingsPipe } from './pipes/handings.pipe';
import { CapitalCaseSpacePipe } from './pipes/capitalCaseSpace.pipe';

@NgModule({
	exports: [
		CapitalCaseSpacePipe,
		HandingsPipe,
        PageHeaderComponent,
		SearchBarComponent
    ],
	declarations: [
		CapitalCaseSpacePipe,
		HandingsPipe,
		PageHeaderComponent,
		SearchBarComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        RouterModule,
        BrowserAnimationsModule
    ],
    providers: [
    ]
})
export class SharedModule { }
