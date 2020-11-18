import { Component, OnInit } from '@angular/core';

import { BrowserService } from '../../../core/services/browser.service';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

@Component({
	selector: 'home',
    templateUrl: 'home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent extends UnsubscribeOnDestroy implements OnInit
{
	fpImageWidth: string = '120%';

	// Place holder data
	salesCommunityName: string = "FoxTail";
	planName: string = "Gardengate Plan";
	planImageUrl: string = "https://pultegroup.picturepark.com/Go/iZPIn4Vh/V/255142/15";

	constructor(private browser: BrowserService)
    {
        super();
    }

	ngOnInit() {
		this.browser.clientWidth().subscribe(width => {
			if (width > 1280) {
				this.fpImageWidth = '100%';
			}
		});
	}
}
