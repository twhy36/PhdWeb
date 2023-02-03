import { Component, Input, Output, EventEmitter } from '@angular/core';

import 
{
	UnsubscribeOnDestroy, slideOut, DecisionPoint, JobChoice, PickType, Choice, ChoiceImageAssoc, Group,
	PointStatus, Tree, MyFavoritesChoice, MyFavoritesPointDeclined
} from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';

@Component({
	selector: 'detailed-decision-bar',
	templateUrl: './detailed-decision-bar.component.html',
	styleUrls: ['./detailed-decision-bar.component.scss'],
	animations: [
		slideOut
	]
})
export class DetailedDecisionBarComponent extends UnsubscribeOnDestroy
{
	@Input() points: DecisionPoint[];
	@Input() salesChoices: JobChoice[];
	@Input() myFavoritesChoices: MyFavoritesChoice[];
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPreview: boolean;
	@Input() isPresale: boolean;
	@Input() isDesignComplete: boolean = false;
	@Input() unfilteredPoints: DecisionPoint[] = [];

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	constructor() { super(); }

	getSubTitle(point: DecisionPoint): string
	{
		if (point)
		{
			const contractedChoices = point.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			const isPreviouslyContracted = contractedChoices && contractedChoices.length;

			switch (point.pointPickTypeId)
			{
				case PickType.Pick1:
					return isPreviouslyContracted ? 'Previously Contracted Option' : 'Please select one of the choices below';
				case PickType.Pick1ormore:
					return isPreviouslyContracted ? 'Previously Contracted Options' : 'Please select at least one of the Choices below';
				case PickType.Pick0ormore:
					return isPreviouslyContracted ? 'Previously Contracted Options' : 'Please select at least one of the Choices below';
				case PickType.Pick0or1:
					return isPreviouslyContracted ? 'Previously Contracted Option' : 'Please select one of the choices below';
				default:
					return '';
			}
		}

		return '';
	}

	getChoiceExt(choice: Choice, point: DecisionPoint): ChoiceExt
	{
		let unfilteredPoint = this.unfilteredPoints.find(up => up.divPointCatalogId === point.divPointCatalogId);
		let choiceStatus = 'Available';
		if (point.isPastCutOff || this.salesChoices?.findIndex(c => c.divChoiceCatalogId === choice.divChoiceCatalogId) > -1)
		{
			choiceStatus = 'Contracted';
		} else
		{
			const contractedChoices = unfilteredPoint.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			if (contractedChoices && contractedChoices.length && (point.pointPickTypeId === PickType.Pick1 || point.pointPickTypeId === PickType.Pick0or1))
			{
				choiceStatus = 'ViewOnly';
			}
		}

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem);
	}

	showDeclineChoice(point: DecisionPoint): boolean
	{
		let unfilteredPoint = this.unfilteredPoints.find(up => up.divPointCatalogId === point.divPointCatalogId);
		return (unfilteredPoint.pointPickTypeId === 2 || point.pointPickTypeId === 4)
			&& !unfilteredPoint.isStructuralItem
			&& !unfilteredPoint.isPastCutOff
			&& unfilteredPoint.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1)?.length === 0;
	}

	toggleChoice(choice)
	{
		this.onToggleChoice.emit(choice);
	}

	viewChoiceDetail(choice)
	{
		this.onViewChoiceDetail.emit(choice);
	}

	declineDecisionPoint(point: DecisionPoint)
	{
		this.onDeclineDecisionPoint.emit(point);
	}

	selectDecisionPoint(pointId: number)
	{
		if (pointId)
		{
			setTimeout(() =>
			{
				const firstPointId = this.points && this.points.length ? this.points[0].id : 0;
				this.scrollPointIntoView(pointId, pointId === firstPointId);
			}, 500);
		}
		this.onSelectDecisionPoint.emit(pointId);
	}

	scrollPointIntoView(pointId: number, isFirstPoint: boolean)
	{
		const decision = document.getElementById(pointId?.toString());
		if (decision)
		{
			if (isFirstPoint)
			{
				decision.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
			} else
			{
				decision.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}
	}

	isPointComplete(point: DecisionPoint)
	{
		return this.isPreview || this.isPresale || this.isDesignComplete
			? point.status === PointStatus.COMPLETED || point.status === PointStatus.PARTIALLY_COMPLETED
			: point.isStructuralItem || point.isPastCutOff || point.status === PointStatus.COMPLETED;
	}

	displayPoint(point: DecisionPoint)
	{
		if (point.isHiddenFromBuyerView)
		{
			return false;
		}
		const choices = point && point.choices ? point.choices.filter(c => !c.isHiddenFromBuyerView) : [];
		return choices && !!choices.length;
	}

	pointById(index: number, point: DecisionPoint)
	{
		return point.id;
	}
}
