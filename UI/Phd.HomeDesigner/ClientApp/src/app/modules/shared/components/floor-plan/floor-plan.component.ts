import { Component, OnInit, OnDestroy, ViewChild, Input } from '@angular/core';
import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';
import { Observable } from 'rxjs';
import { flatMap } from 'rxjs/operators';

import { loadScript, unloadScript } from 'phd-common/utils';
import { environment } from '../../../../../environments/environment';

declare var AVFloorplan: any;

@Component({
	selector: 'floor-plan',
	templateUrl: 'floor-plan.component.html',
	styleUrls: ['floor-plan.component.scss']
})

export class FloorPlanComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy
{
	@ViewChild('av_floor_plan') img: any;

	@Input() width: string = '100%';
	@Input() planId$: Observable<number>;

	fp: any;
	private readonly avAPISrc = "//vpsstorage.blob.core.windows.net/api/floorplanAPIv2.3.js";
	private readonly jquerySrc = "//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min.js";
	planId: number = 0;

	constructor()
    {
      super();
    }

	ngOnInit(): void {

		let wd: any = window;
		wd.message = function (str) { };

		loadScript(this.jquerySrc).pipe(
			flatMap(() => loadScript(this.avAPISrc)),
			flatMap(() => this.planId$)			
		).subscribe(planId => {
			if (planId > 0 && this.planId !== planId) {
				this.planId = planId;
				try {
					this.fp = wd.fp = new AVFloorplan(environment.alphavision.builderId, "" + planId, document.querySelector("#av-floor-plan"), [], this.fpInitialized.bind(this));
				}
				catch (err) {
					this.fp = { graphic: undefined };

					this.fpInitialized();
				}
			}
		});
	}

	ngOnDestroy(): void {
		unloadScript("code.jquery.com", "jQuery", "$");
		unloadScript("alpha-vision.com", "AVFloorplan");

		let wd: any = window;

		delete wd.message;
		delete wd.fp;

		super.ngOnDestroy();
	}

	private fpInitialized(): void {
		this.fp.setRoomsColor("#080049");
		this.fp.setOptionsColor("#48A5F1");
		this.fp.addHomeFootPrint("#eaf1fc");
	}

}
