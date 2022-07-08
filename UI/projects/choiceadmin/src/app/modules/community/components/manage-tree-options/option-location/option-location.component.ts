import { Component, Input, OnInit } from '@angular/core';

import { finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { TreeService } from '../../../../core/services/tree.service';
import { OrganizationService } from '../../../../core/services/organization.service';

import { ITreeOption } from '../../../../shared/models/option.model';
import { PhdApiDto } from '../../../../shared/models/api-dtos.model';

@Component({
	selector: 'option-location',
	templateUrl: './option-location.component.html',
	styleUrls: ['./option-location.component.scss']
})
export class OptionLocationComponent implements OnInit
{
	@Input() option: ITreeOption;

	optionLocationMessage: string = '';
	locationGroupLoaded: boolean = false;
	locationGroup: PhdApiDto.ILocationGroupCommunity;
	
	constructor(private _msgService: MessageService, private _treeService: TreeService, private _orgService: OrganizationService) { }

	ngOnInit(): void
	{
		this.getLocationGroup();
	}

	get searchTags(): string
	{
		var tags = '';

		if (this.locationGroup && this.locationGroup.locationGroupCommunityTags.length)
		{
			tags = this.locationGroup.locationGroupCommunityTags.map(t => t.tag).join(', ');
		}

		return tags;
	}

	getLocationGroup()
	{
		this._treeService.getOptionLocationGroupCommunity(+this._orgService.currentFinancialCommunity?.id, this.option.id)
			.pipe(finalize(() => this.locationGroupLoaded = true))
			.subscribe(locationGroup =>
			{
				if (locationGroup.length)
				{
					this.locationGroup = locationGroup[0];
				}
				else
				{
					this.optionLocationMessage = `A Location has not been assigned to this option.`;
				}
			},
			error =>
			{
				this.optionLocationMessage = `Unable to load Location for this option.`;
			});
	}
}
