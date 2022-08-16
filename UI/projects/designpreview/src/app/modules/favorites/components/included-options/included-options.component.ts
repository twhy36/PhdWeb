import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, flipOver, DecisionPoint, SubGroup, Choice, ChoiceImageAssoc, TreeVersion
} from 'phd-common';

import { ChoiceExt } from '../../../shared/models/choice-ext.model';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { TreeService } from '../../../core/services/tree.service';

@Component({
	selector: 'included-options',
	templateUrl: './included-options.component.html',
	styleUrls: ['./included-options.component.scss'],
	animations: [flipOver]
})
export class IncludedOptionsComponent extends UnsubscribeOnDestroy implements OnInit
{
	communityName: string = '';
	planName: string = '';
	choiceImages: ChoiceImageAssoc[];
	isPointPanelCollapsed: boolean = false;
	points: DecisionPoint[];
	currentPointId: number;
	subGroup: SubGroup;
	choiceToggled: boolean = false;
	tree: TreeVersion;
	buildMode: BuildMode;
	noVisibleGroups: boolean = false;

	constructor(private store: Store<fromRoot.State>,
		private treeService: TreeService) { super(); }

	ngOnInit() { 
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData => {
			this.planName = planData && planData.salesName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName => {
			this.communityName = communityName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree =>
		{
			if (tree)
			{
				this.tree = tree;
				if (!this.tree.groups.length)
				{
					this.noVisibleGroups = true;
				} else
				{
					this.noVisibleGroups = false;
				}
				this.points = _.flatMap(this.tree.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];	

				const choiceIds = (_.flatMap(this.points, pt => pt.choices) || []).filter(c => c.isDecisionDefault).map(c => c.id);

				return this.treeService.getChoiceImageAssoc(choiceIds)
					.subscribe(choiceImages =>
					{
						this.choiceImages = choiceImages;
					});
				}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state?.scenario)
		).subscribe(scenario =>
		{
			this.buildMode = scenario.buildMode;
		});
	}

	togglePointPanel() {
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPoint(pointId: number, interval?: number) {
		if (pointId)
		{
			setTimeout(() =>
			{
				const firstPointId = this.points && this.points.length ? this.points[0].id : 0;
				this.scrollPointIntoView(pointId, pointId === firstPointId);
			}, interval || 500);
		}

		this.currentPointId = pointId;
	}

	choiceToggleHandler(choice: ChoiceExt) {
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));
		if (point && this.currentPointId != point.id) {
			this.currentPointId = point.id;
		}
		this.choiceToggled = true;
	}

	getChoiceExt(choice: Choice, point: DecisionPoint) : ChoiceExt
	{
		let choiceStatus = 'Available';

		const myFavoritesChoice = null;
		const images = this.choiceImages?.filter(x => x.dpChoiceId === choice.id);

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem, images);
	}

	scrollPointIntoView(pointId: number, isFirstPoint: boolean)
	{
		const pointCardElement = <HTMLElement><any>document?.getElementById(`included-point-${pointId?.toString()}`);
		if (pointCardElement)
		{
			if (isFirstPoint)
			{
				setTimeout(() => {
					pointCardElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
				}, 250);
			}
			else
			{
				// Workaround to display the element moved under the nav bar
				setTimeout(() => {
					const pos = pointCardElement.style.position;
					const top = pointCardElement.style.top;
					pointCardElement.style.position = 'relative';
					pointCardElement.style.top = '-10px';
					pointCardElement.scrollIntoView({behavior: 'smooth', block: 'start'});
					pointCardElement.style.top = top;
					pointCardElement.style.position = pos;
				}, 250);
			}
		}

		const decisionBarElement = document.getElementById('decision-bar-' + pointId?.toString());
		if (decisionBarElement) {
			decisionBarElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
		}
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		const pointId = this.points?.length ? this.points.find(p => p.choices.find(c => c.id === choice.id))?.id || this.points[0].id : 0;
		this.selectDecisionPoint(pointId);
	}

	defaultChoicePresent(subGroup: SubGroup) {
		const choices = _.flatMap(subGroup.points, p => p.choices).filter(c => c.isDecisionDefault);
		return choices.length > 0;
	}

	displayedChoices(choices: ChoiceExt[]) {
		return choices.filter(c => c.isDecisionDefault);
	}

	displayDecisionPoint(point: DecisionPoint) {
		if (point.isHiddenFromBuyerView) {
			return false;
		} else {
			const choices = _.flatMap(point.choices).filter(c => c.isDecisionDefault);
			let displayChoice = false;
			choices.forEach(c => {
				if (!c.isHiddenFromBuyerView) {
					displayChoice = true;
				}
			})
			return displayChoice;
		}
	}

	onNextClicked() {
		return 0;
	}
}
