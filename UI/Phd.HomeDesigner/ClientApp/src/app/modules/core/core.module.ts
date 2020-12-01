import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';

import { BrowserService } from './services/browser.service';

@NgModule({
	exports: [
		NavBarComponent
	],
	declarations: [
		NavBarComponent
	],
	imports: [
		CommonModule
	],
	providers: [
		BrowserService
	]
})
export class CoreModule { }
