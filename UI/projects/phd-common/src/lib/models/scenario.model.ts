import { ChangeOrderHanding } from './job-change-order.model';
import { DesignToolAttribute } from "./attribute.model";

export interface DtoScenario
{
	choices: Array<DtoScenarioChoice>;
	createdBy?: string;
	createdUtcDate?: Date;
	handing: ChangeOrderHanding;
	id?: number;
	isLotPremiumOverride?: false;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: Date;
	lotId: number;
	lotPremiumOverride?: 0;
	name: string;
	opportunityId: string;
	originalTreeVersionId?: number;
	planId: number;
	scenarioInfo: DtoScenarioInfo;
	treeVersionId: number;
	viewedDivDPointCatalogIds: Array<number>;
	salesAgreementId?: number;
	financialCommunityId?: number;
	marketId?: number;
}

export interface DtoScenarioInfo
{
	closingIncentive: number;
	designEstimate: number;
	discount: number;
	homesiteEstimate: number;
	isFloorplanFlipped?: boolean;
}

export interface DtoScenarioChoice
{
	scenarioChoiceId: number;
	scenarioId: number;
	dpChoiceID: number;
	dpChoiceQuantity: number;
	divChoiceCatalogID: number;
	attributes: Array<DtoScenarioChoiceAttribute>;
	locations: Array<DtoScenarioChoiceLocation>;
}

export interface DtoScenarioChoiceAttribute
{
	scenarioChoiceAttributeId: number;
	scenarioChoiceId: number;
	attributeGroupCommunityId: number;
	attributeCommunityId: number;
	attributeGroupName: string;
	attributeGroupLabel: string;
	attributeName: string;
	attributeImageUrl: string;
	sku: string;
	manufacturer: string;
}

export interface DtoScenarioChoiceLocationAttribute
{
	scenarioChoiceLocationAttributeId: number;
	scenarioChoiceLocationId: number;
	attributeGroupCommunityId: number;
	attributeCommunityId: number;
	attributeGroupName: string;
	attributeGroupLabel: string;
	attributeName: string;
	attributeImageUrl: string;
	sku: string;
	manufacturer: string;
}

export interface DtoScenarioChoiceLocation
{
	scenarioChoiceLocationId: number;
	scenarioChoiceId: number;
	locationGroupCommunityId: number;
	locationCommunityId: number;	
	quantity: number;
	attributes: Array<DtoScenarioChoiceLocationAttribute>;
	locationGroupName: string;
	locationGroupLabel: string;
	locationName: string;
}

export interface TreeFilter
{
	filterType: string;
	keyword: string;
}

export class Scenario
{
	scenarioId?: number;
	scenarioName: string;
	opportunityId: string;
	treeVersionId: number;
	originalTreeVersionId?: number;
	planId: number;
	lotId: number;
	handing: ChangeOrderHanding;
	scenarioChoices: SelectedChoice[];
	viewedDecisionPoints: Array<number>;
	scenarioInfo: DtoScenarioInfo;
	salesAgreementId?: number;
	financialCommunityId?: number;
	marketId?: number;
	scenarioOptions: ScenarioOption[];

	constructor(scenarioDto?: DtoScenario)
	{
		if (scenarioDto)
		{
			this.scenarioId = scenarioDto.id;
			this.scenarioName = scenarioDto.name;
			this.opportunityId = scenarioDto.opportunityId;
			this.planId = scenarioDto.planId;
			this.lotId = scenarioDto.lotId;
			this.handing = scenarioDto.handing;
			this.treeVersionId = scenarioDto.treeVersionId;
			this.originalTreeVersionId = scenarioDto.originalTreeVersionId;
			this.scenarioInfo = scenarioDto.scenarioInfo;
			this.scenarioChoices = scenarioDto.choices
				.map<SelectedChoice>(choice =>
				{
					let selectedAttributes: Array<DesignToolAttribute> = [];

					if (choice.locations.length)
					{
						selectedAttributes = selectedAttributes.concat(mapLocations(choice.locations));
					}

					if (choice.attributes.length)
					{
						selectedAttributes = selectedAttributes.concat(mapAttributes(choice.attributes));
					}

					return {
						scenarioChoiceId: choice.scenarioChoiceId,
						choiceId: choice.dpChoiceID,
						choiceQuantity: choice.dpChoiceQuantity,
						choice: { choiceCatalogId: choice.divChoiceCatalogID },
						selectedAttributes: selectedAttributes
					};
				});

			this.viewedDecisionPoints = scenarioDto.viewedDivDPointCatalogIds;
			this.salesAgreementId = scenarioDto.salesAgreementId;
			this.financialCommunityId = scenarioDto.financialCommunityId;
			this.marketId = scenarioDto.marketId;

			// PHD Lite
			this.scenarioOptions = scenarioDto['options'] && scenarioDto['options'].length
				? scenarioDto['options'].map(option => {
					return {
						scenarioOptionId: option['scenarioOptionId'],
						scenarioId: option['scenarioId'],
						edhPlanOptionId: option['edhPlanOptionId'],
						planOptionQuantity: option['planOptionQuantity'],
						scenarioOptionColors: option['colors'] && option['colors'].length
							? option['colors'].map(color => {
								return {
									scenarioOptionColorId: color['scenarioOptionColorId'],
									scenarioOptionId: color['scenarioOptionId'],
									colorItemId: color['colorItemId'],
									colorId: color['colorId']									
								}
							})
							: []				
					};
				})
				: [];
		}
	}
}

function mapLocations(locationsDto: Array<DtoScenarioChoiceLocation>): Array<DesignToolAttribute>
{
	return locationsDto.map(l =>
	{
		let locations: Array<DesignToolAttribute> = [];

		if (l.attributes.length)
		{
			l.attributes.forEach(a =>
			{
				locations.push({
					scenarioChoiceLocationId: a.scenarioChoiceLocationId,
					scenarioChoiceLocationAttributeId: a.scenarioChoiceLocationAttributeId,
					locationGroupId: l.locationGroupCommunityId,
					locationGroupName: l.locationGroupName,
					locationGroupLabel: l.locationGroupLabel,
					locationId: l.locationCommunityId,
					locationName: l.locationName,
					attributeGroupId: a.attributeGroupCommunityId,
					attributeGroupName: a.attributeGroupName,
					attributeGroupLabel: a.attributeGroupLabel,
					attributeId: a.attributeCommunityId,
					attributeName: a.attributeName,
					attributeImageUrl: a.attributeImageUrl,
					locationQuantity: l.quantity,
					sku: a.sku,
					manufacturer: a.manufacturer
				});
			});
		}
		else
		{
			locations.push({
				scenarioChoiceLocationId: l.scenarioChoiceLocationId,
				scenarioChoiceLocationAttributeId: null,
				locationGroupId: l.locationGroupCommunityId,
				locationGroupName: l.locationGroupName,
				locationGroupLabel: l.locationGroupLabel,
				locationId: l.locationCommunityId,
				locationName: l.locationName,
				locationQuantity: l.quantity,
				attributeGroupId: null,
				attributeGroupName: null,
				attributeGroupLabel: null,
				attributeId: null,
				attributeName: null,
				attributeImageUrl: null,				
				sku: '',
				manufacturer: ''
			});
		}

		return locations;
	}).reduce((acc: Array<DesignToolAttribute>, val) =>
	{
		return acc.concat(val, []);
	});
}

function mapAttributes(attributesDto: Array<DtoScenarioChoiceAttribute>): Array<DesignToolAttribute>
{
	return attributesDto.map<DesignToolAttribute>(a =>
	{
		return {
			scenarioChoiceLocationId: null,
			scenarioChoiceLocationAttributeId: a.scenarioChoiceAttributeId,
			locationGroupId: null,
			locationGroupName: null,
			locationGroupLabel: null,
			locationId: null,
			locationName: null,
			locationQuantity: null,
			attributeGroupId: a.attributeGroupCommunityId,
			attributeGroupName: a.attributeGroupName,
			attributeGroupLabel: a.attributeGroupLabel,
			attributeId: a.attributeCommunityId,
			attributeName: a.attributeName,
			attributeImageUrl: a.attributeImageUrl,
			sku: a.sku,
			manufacturer: a.manufacturer
		};
	});
}

export interface SelectedChoice
{
	scenarioChoiceId: number;
	choiceId: number;
	choiceQuantity: number;
	choice: {
		choiceCatalogId: number;
	};
	selectedAttributes: Array<DesignToolAttribute>;
}

export class PriceBreakdown
{
	baseHouse: number = 0;
	homesite: number = 0;
	selections: number = 0;
	salesProgram: number = 0;
	closingIncentive: number = 0;

	nonStandardSelections: number = 0;
	priceAdjustments: number = 0;
	closingCostAdjustment: number = 0;

	homesiteEstimate: number = 0;
	designEstimate: number = 0;

	totalPrice: number = 0;
	changePrice: number = 0;
	favoritesPrice: number = 0;

	constructor(dto?: DtoScenarioInfo)
	{
		if (dto)
		{
			this.homesiteEstimate = dto.homesiteEstimate;
			this.designEstimate = dto.designEstimate;
			this.salesProgram = dto.discount;
			this.closingIncentive = dto.closingIncentive;
		}
	}
}

export type modes = 'sales' | 'preview';

export enum PriceBreakdownType
{
	HOMESITE,
	DESIGN,
	DISCOUNT,
	CLOSING,
	CLOSINGCOSTADJUSTMENT,
	SELECTIONS,
	NONSTANDARD
}

export enum ScenarioStatusType
{
	MONOTONY_CONFLICT,
	READY_FOR_STRUCTURAL,
	READY_FOR_DESIGN,
	READY_TO_BUILD
}

// BEGIN PHD Lite
export interface ScenarioOption
{
	scenarioOptionId: number;
	scenarioId: number;
	edhPlanOptionId: number;
    planOptionQuantity: number;
    scenarioOptionColors: ScenarioOptionColor[];
}

export interface ScenarioOptionColor
{
    scenarioOptionColorId: number;
    scenarioOptionId: number;
    colorItemId: number;
    colorId: number;
}
// END PHD Lite
