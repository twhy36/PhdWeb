import { ChangeOrderHanding } from './job-change-order.model';
import { HomeDesignerAttribute } from "./attribute.model";

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
					let selectedAttributes: Array<HomeDesignerAttribute> = [];

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
		}
	}
}

function mapLocations(locationsDto: Array<DtoScenarioChoiceLocation>): Array<HomeDesignerAttribute>
{
	return locationsDto.map(l =>
	{
		let locations: Array<HomeDesignerAttribute> = [];

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
	}).reduce((acc: Array<HomeDesignerAttribute>, val) =>
	{
		return acc.concat(val, []);
	});
}

function mapAttributes(attributesDto: Array<DtoScenarioChoiceAttribute>): Array<HomeDesignerAttribute>
{
	return attributesDto.map<HomeDesignerAttribute>(a =>
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
	selectedAttributes: Array<HomeDesignerAttribute>;
}

export class PriceBreakdown
{
	salesPrice: number = 0;
	changePrice: number = 0;
	totalPrice: number = 0;
}

export type modes = 'sales' | 'preview';

export enum PriceBreakdownType
{
	HOMESITE,
	DESIGN,
	DISCOUNT,
	CLOSING,
	CLOSINGCOSTADJUSTMENT
}

export enum ScenarioStatusType
{
	MONOTONY_CONFLICT,
	READY_FOR_STRUCTURAL,
	READY_FOR_DESIGN,
	READY_TO_BUILD
}
