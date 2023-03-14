import { Component, OnInit, TemplateRef, ContentChild } from '@angular/core';
import { LoadingService } from '../../../../core/services/loading.service';
import { startWith, delay } from 'rxjs/operators';

@Component({
	selector: 'divisional-attribute-template',
	templateUrl: './divisional-attribute-template.component.html',
	styleUrls: ['./divisional-attribute-template.component.scss']
})
export class DivisionalAttributeTemplateComponent implements OnInit 
{
	@ContentChild('panel') panelTemplate: TemplateRef<any>;
	@ContentChild('actionPanel') actionPanelTemplate: TemplateRef<any>;
	@ContentChild('sidePanel') sidePanelTemplate: TemplateRef<any>;

	isLoading: boolean = false;

	constructor(private _loadingService: LoadingService) { }

	ngOnInit(): void
	{
		this._loadingService.isLoading$.pipe(
			startWith(null),
			delay(0)
		).subscribe(isLoading => this.isLoading = isLoading);
	}

}
