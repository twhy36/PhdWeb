import { Component, Input, OnInit, ContentChild, TemplateRef, ViewEncapsulation } from '@angular/core';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { LinkAction } from '../../models/action.model';

import { environment } from '../../../../../environments/environment';
import { IdentityService } from 'phd-common/services';

@Component({
	selector: 'portal-item',
	templateUrl: './portal-item.component.html',
	styleUrls: ['./portal-item.component.scss'],
	encapsulation: ViewEncapsulation.None
})

export class PortalItemComponent implements OnInit
{
	@Input() title: string = "";
	@Input() action: LinkAction;
	@Input() envBaseUrl;
	@Input() icon;
	@Input() modalSize: 'lg' | 'sm';

	@ContentChild(TemplateRef) template: TemplateRef<any>;

	url: string;
	ref: NgbModalRef;

	constructor(private _modalService: NgbModal, private _idService: IdentityService) { }

	ngOnInit()
	{
		if (this.action)
		{
			this.url = environment.baseUrl[this.action.envBaseUrl] + this.action.path;
		}
	}

	onClicked()
	{
		if (!this.template)
		{
			window.open(this.url, "_blank");
		}
		else
		{
			const options: NgbModalOptions = {
				backdrop: 'static',
				centered: true,
				windowClass: `phd-modal-window phd-${this.icon}-modal`
			};

			if (this.modalSize)
			{
				options.size = this.modalSize;
			}

			this.ref = this._modalService.open(this.template, options);
		}
	}

	close()
	{
		this.ref.close();
	}
}
