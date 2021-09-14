import { Component, OnInit } from '@angular/core';
import { UnsubscribeOnDestroy } from 'phd-common';
import { IPlanCommunity, IOptionCommunity } from '../../../shared/models/community.model';
import { OrganizationService } from '../../services/organization.service';
import { PlanOptionService } from '../../services/plan-option.service';
import { Observable } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

@Component({
	selector: 'color-items-search-header',
	templateUrl: './color-items-search-header.component.html',
	styleUrls: ['./color-items-search-header.component.scss']
})
export class ColorItemsSearchHeaderComponent
	extends UnsubscribeOnDestroy
	implements OnInit {
	planCommunityList$: Observable<Array<IPlanCommunity>>;
	currentFinancialCommunityId: number;
	selectedPlans: Array<number> = [];
	planOptionList: Array<IOptionCommunity>;
	currentOption: IOptionCommunity = null;
	isActiveColor: boolean = null;

	constructor(
		private _orgService: OrganizationService,
		private _planService: PlanOptionService
	) {
		super();
	}

	ngOnInit() {
		this.planCommunityList$ = this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter((comm) => !!comm),
			switchMap((comm) => {
				this.selectedPlans = [];
				this.currentFinancialCommunityId = comm.id;
				return this._planService.getPlanCommunities(this.currentFinancialCommunityId).pipe(
					map((plans) => {
						return [
							{ planSalesName: 'All Plans', id: 0 },
							...plans
						];
					})
				)
			})
		);
	}

	onShowOptions() {
		let ids = null;

		// if >= 0 means user selected all plans
		// if -1 means user selected individual plans
		if (this.selectedPlans?.findIndex(x => x == 0) == -1) {
			ids = this.selectedPlans;
		}

		this._planService
			.getPlanOptions(this.currentFinancialCommunityId, ids)
			.subscribe((options)=>this.planOptionList = options);
	}

	onActiveColorChange() {
		//TODO: This needs to be wired in when ready for grid
		console.log(`IsActiveColor: ${this.isActiveColor}`);
	}

	onChangeOption() {
		//TODO: This needs to be wired in when ready for grid
		console.log(`CurrentOption: Id = ${this.currentOption?.id??null}  Name = ${this.currentOption?.optionSalesName??'All Options'}`);
	}
}
