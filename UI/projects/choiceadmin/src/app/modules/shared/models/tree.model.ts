import * as moment from "moment";
import { PhdApiDto, PhdEntityDto } from './api-dtos.model';
import { LocationGroupMarket } from "./location-group-market.model";
import { AttributeGroupMarket } from "./attribute-group-market.model";
import { ConstructionStageTypes } from "./point.model";

const fifteenSeconds = 15 * 1000;

export interface IItemAdd
{
	text: string;
	id: number;
	isDefault: boolean;
	isSelected: boolean;
}

export interface IDTree
{
	id: number;
	orgId: number;
	planId: number;
	planKey: string;
	commId: number;
	commKey: string;

	version: IDTVersion;
}

export interface IDTVersion
{
	id: number;
	description: string;
	name: string;
	treeId: number;
	publishStartDate: moment.Moment;
	publishEndDate: moment.Moment;
	isReadOnly: boolean;

	groups: Array<IDTGroup>;
}

export interface IDTGroup
{
	id: number;
	groupCatalogId: number;
	label: string;
	sortOrder: number;

	open: boolean;
	matched: boolean;

	subGroups: Array<IDTSubGroup>;
}

export interface IDTSubGroup
{
	id: number;
	treeVersionId: number;
	groupId: number;
	subGroupCatalogId: number;
	label: string;
	isActive: boolean;
	sortOrder: number;
	open: boolean;
	matched: boolean;
	hasUnusedPoints: boolean;
	useInteractiveFloorplan: boolean;
	parent: DTGroup;
	points: Array<IDTPoint>;
}

export interface IDTPoint
{
	id: number;
	treeVersionId: number;
	subGroupId: number;
	divPointCatalogId: number;
	pointPickTypeId: number;
	pointPickTypeLabel: string;
	isQuickQuoteItem: boolean;
	isStructuralItem: boolean;
	isHiddenFromBuyerView: boolean;
	cutOffDays: number;
	edhConstructionStageId: number;
	label: string;
	description: string;
	sortOrder: number;
	hasPointToPointRules: boolean;
	hasPointToChoiceRules: boolean;
	hasUnusedChoices: boolean;
	open: boolean;
	matched: boolean;
	sortChanged: boolean;

	parent: DTSubGroup;
	choices: Array<IDTChoice>;
}

export interface IDTChoice
{
	id: number;
	treeVersionId: number;
	treePointId: number;
	divChoiceCatalogId: number;
	sortOrder: number;
	isSelectable: boolean;
	isDecisionDefault: boolean;
	label: string;
	description: string;
	imagePath: string;
	hasImage: boolean;
	hasDivCatalogChoiceImages: boolean;
	maxQuantity?: number;
	hasChoiceRules: boolean;
	hasOptionRules: boolean;
	hasAttributes: boolean;
	hasDivCatalogChoiceAttributes: boolean;
	hasLocations: boolean;
	hasDivCatalogChoiceLocations: boolean;
	parent: DTPoint;
	open: boolean;
	matched: boolean;
	sortChanged: boolean;
	isHiddenFromBuyerView?: boolean;
	priceHiddenFromBuyerView?: boolean;
}

export class DTree implements IDTree
{
	version: IDTVersion;

	id = 0;
	orgId = 0;
	planId = 0;
	planKey = '';
	commId = 0;
	commKey = '';
	marketId = 0;

	private _dto: PhdApiDto.IDTreeDto;
	get dto() { return this._dto; }
	set dto(dto: PhdApiDto.IDTreeDto)
	{
		this.id = dto.id;
		this.orgId = dto.orgId;
		this.planId = dto.planId;
		this.planKey = dto.planKey;
		this.commId = dto.financialCommunityId;
		this.commKey = dto.communityKey;
		this.marketId = dto.marketId;
		this._dto = dto;
	}

	constructor(dto: PhdApiDto.IDTreeDto, version: IDTVersion)
	{
		if (dto == null)
		{
			throw new Error('dto must be specified');
		}

		this.dto = dto;

		if (version == null)
		{
			throw new Error('version must be specified');
		}

		this.version = version;
	}

	dispose()
	{
		if (this.version != null)
		{
			if ('dispose' in this.version)
			{
				(this.version as any).dispose();
			}
		}
	}
}

export class DTVersion implements IDTVersion
{
	constructor(dto: PhdApiDto.IDTreeVersionDto, groups?: Array<IDTGroup>)
	{
		this.dto = dto;
		this.groups = groups;
	}

	id = 0;
	description = '';
	name = '';
	treeId = 0;
	publishStartDate: moment.Moment = null;
	publishEndDate: moment.Moment = null;

	private _dto: PhdApiDto.IDTreeVersionDto;
	get dto() { return this._dto; }
	set dto(dto)
	{
		this.id = dto.id;
		this.description = dto.description;
		this.name = dto.name;
		this.treeId = dto.treeId;

		if (dto.publishStartDate)
		{
			this.publishStartDate = moment.utc(dto.publishStartDate);
		}

		if (dto.publishEndDate)
		{
			this.publishEndDate = moment.utc(dto.publishEndDate);
		}

		this._dto = dto;
	}

	groups: Array<IDTGroup>;

	get isReadOnly()
	{
		const effectiveDate = this.publishStartDate;

		if (effectiveDate != null) 
		{
			return this.publishStartDate.diff(moment.utc()) - fifteenSeconds <= 0;
		}

		return false;
	}
}

export class DTreeVersionDropDown
{
	constructor(dto: PhdEntityDto.IDTreeVersionDto)
	{
		this.dto = dto;
	}

	id: number;
	name: string;
	effectiveDate: moment.Moment;
	endDate: moment.Moment;

	private _dto: PhdEntityDto.IDTreeVersionDto;
	get dto() { return this._dto; }
	set dto(dto)
	{
		this.id = dto.dTreeVersionID;
		this.name = dto.dTreeVersionName;

		if (dto.publishStartDate)
		{
			this.effectiveDate = dto.publishStartDate ? moment.utc(dto.publishStartDate).local() : null;
		}

		if (dto.publishEndDate)
		{
			this.endDate = dto.publishEndDate ? moment.utc(dto.publishEndDate).local() : null;
		}

		this._dto = dto;
	}

	get tooltip()
	{
		const text = this.ddTreeTooltipFormat(this.effectiveDate, this.endDate, moment.utc(this.dto.lastModifiedDate).local(), this.name);

		return text;
	}

	get displayName()
	{
		return this.ddTreeDisplayFormat(this.effectiveDate, this.endDate, moment.utc(this.dto.lastModifiedDate).local(), this.name);
	}

	private ddTreeTooltipFormat = (startDate: moment.Moment, endDate: moment.Moment, lastModified: moment.Moment, title: string): string =>
	{
		let text = '';

		if (startDate == null)
		{
			text = `Draft - ${lastModified.format("M/DD/YYYY")}`;
		}
		else
		{
			let start = startDate.format("M/DD/YYYY h:mm A");
			let end = endDate == null ? '' : endDate.format("M/DD/YYYY h:mm A");

			text = '<table class="phd-tree-select-tooltip">';
			text += `<thead><th colspan="2">${title}</th></thead>`;
			text += `<tbody><tr>`;
			text += `<td>${start}</td>`;
			text += `<td>${end}</td>`
			text += '</tr></tbody>'
			text += '</table>';
		}

		return text;
	}

	private ddTreeDisplayFormat = (startDate: moment.Moment, endDate: moment.Moment, lastModified: moment.Moment, title: string): string =>
	{
		let text = '';
		let dateFormat = 'M/DD/YYYY';

		if (startDate == null)
		{
			text = `Draft - ${lastModified.format(dateFormat)}`;
		}
		else
		{
			let formattedName = title.substr(0, 20);

			if (formattedName.length == 20)
			{
				formattedName += ' ...';
			}

			text = `${formattedName} - ${startDate.format(dateFormat)}`;

			if (endDate != null)
			{
				text += ` - ${endDate.format(dateFormat)}`;
			}
		}

		return text;
	}
}

export class DTGroup implements IDTGroup
{
	id = 0;
	groupCatalogId = 0;
	label = '';
	sortOrder = 0;

	open = true;
	matched = true;

	// todo try to change this 
	subGroups: Array<IDTSubGroup> = [];

	private _dto: PhdApiDto.IDTreeGroupDto;
	get dto() { return this._dto; }
	set dto(dto)
	{
		this.id = dto.id;
		this.groupCatalogId = dto.groupCatalogId;
		this.label = dto.label;
		this.sortOrder = dto.sortOrder;
		this._dto = dto;
	}

	constructor(dto: PhdApiDto.IDTreeGroupDto, subGroups?: Array<IDTSubGroup>)
	{
		this.dto = dto;
		this.subGroups = subGroups ? subGroups : [];
	}
}

export class DTSubGroup implements IDTSubGroup
{
	id = 0;
	treeVersionId = 0;
	groupId = 0;
	subGroupCatalogId = 0;
	label = '';
	isActive = true;
	sortOrder = 0;
	hasUnusedPoints = false;
	useInteractiveFloorplan = false;
	isFloorplanSubgroup = false;

	open = true;
	matched = true;

	points: Array<IDTPoint>;

	parent: DTGroup = null;

	private _dto: PhdApiDto.IDTreeSubGroupDto;
	get dto() { return this._dto; }
	set dto(dto)
	{
		this.id = dto.id;
		this.treeVersionId = dto.treeVersionId;
		this.subGroupCatalogId = dto.subGroupCatalogId;
		this.groupId = dto.groupId;
		this.label = dto.label;
		this.sortOrder = dto.sortOrder;
		this.hasUnusedPoints = dto.hasUnusedPoints;
		this.useInteractiveFloorplan = dto.useInteractiveFloorplan;
		this.isFloorplanSubgroup = dto.isFloorplanSubgroup;
		this._dto = dto;
	}

	constructor(dto: PhdApiDto.IDTreeSubGroupDto, points?: Array<IDTPoint>)
	{
		this.dto = dto;
		this.points = points ? points : [];
	}
}

export class DTPoint implements IDTPoint
{
	id = 0;
	treeVersionId = 0;
	subGroupId = 0;
	divPointCatalogId = 0;
	pointPickTypeId = 0;
	pointPickTypeLabel = '';
	isQuickQuoteItem = false;
	isStructuralItem = false;
	isHiddenFromBuyerView = false;
	label = '';
	description = '';
	sortOrder = 0;
	hasPointToPointRules = false;
	hasPointToChoiceRules = false;
	hasUnusedChoices = false;
	open = true;
	matched = true;
	sortChanged = false;
	showConfirm = false;
	hasChanges = false;
	edhConstructionStageId;
	cutOffDays;

	choices: Array<IDTChoice>;

	parent: DTSubGroup = null;

	private _dto: PhdApiDto.IDTreePointDto;
	get dto() { return this._dto; }
	set dto(dto)
	{
		this.id = dto.id
		this.treeVersionId = dto.treeVersionId;
		this.subGroupId = dto.subGroupId;
		this.divPointCatalogId = dto.divPointCatalogId;
		this.pointPickTypeId = dto.pointPickTypeId;
		this.pointPickTypeLabel = dto.pointPickTypeLabel;
		this.isQuickQuoteItem = dto.isQuickQuoteItem;
		this.isStructuralItem = dto.isStructuralItem;
		this.isHiddenFromBuyerView = dto.isHiddenFromBuyerView;
		this.label = dto.label;
		this.description = dto.description;
		this.sortOrder = dto.sortOrder;
		this.hasPointToPointRules = dto.hasPointToPointRules;
		this.hasPointToChoiceRules = dto.hasPointToChoiceRules;
		this.hasUnusedChoices = dto.hasUnusedChoices;
		this.edhConstructionStageId = dto.edhConstructionStageId;
		this.cutOffDays = dto.cutOffDays;

		this._dto = dto;
	}

	get labelHeirarchy()
	{
		const groupLabel = this.parent.parent.label;
		const subGroupLabel = this.parent.label;

		return `${groupLabel} >> ${subGroupLabel} >> ${this.label}`;
	}

	get cutOff(): string
	{
		let cutOffDays = this.cutOffDays;
		let stageId = this.edhConstructionStageId;
		let cutOff: string;

		if (stageId != null)
		{
			cutOff = ConstructionStageTypes[stageId];
		}
		else if (cutOffDays != null)
		{
			let addS = cutOffDays === 1 || cutOffDays === -1 ? '' : 's';

			cutOff = `${cutOffDays} Day${addS}`;
		}

		return cutOff;
	}

	constructor(dto: PhdApiDto.IDTreePointDto, choices?: Array<IDTChoice>)
	{
		this.dto = dto;
		this.choices = choices ? choices : [];
	}
}

export class DTChoice implements IDTChoice
{
	id = 0;
	treeVersionId = 0;
	treePointId = 0;
	divChoiceCatalogId = 0;
	sortOrder = 0;
	isSelectable = false;
	isDecisionDefault = false;
	label = '';
	description = '';
	imagePath = '';
	hasImage = false;
	hasDivCatalogChoiceImages = false;
	hasChoiceRules = false;
	hasOptionRules = false;
	hasAttributes = false;
	hasDivCatalogChoiceAttributes = false;
	hasLocations = false;
	hasDivCatalogChoiceLocations = false;
	maxQuantity = null;
	imageCount?= 0;
	isHiddenFromBuyerView = false;
	priceHiddenFromBuyerView = false;

	open = true;
	matched = true;
	sortChanged = false;
	showConfirm = false;
	hasChanges = false;

	parent: DTPoint = null;

	private _dto: PhdApiDto.IDTreeChoiceDto;
	get dto() { return this._dto; }
	set dto(dto)
	{
		this.id = dto.id;
		this.treeVersionId = dto.treeVersionId;
		this.treePointId = dto.treePointId
		this.divChoiceCatalogId = dto.divChoiceCatalogId;
		this.sortOrder = dto.sortOrder;
		this.isSelectable = dto.isSelectable;
		this.isDecisionDefault = dto.isDecisionDefault;
		this.label = dto.label;
		this.imagePath = dto.imagePath;
		this.hasImage = dto.hasImage;
		this.hasDivCatalogChoiceImages = dto.hasDivCatalogChoiceImages;
		this.hasChoiceRules = dto.hasChoiceRules;
		this.hasOptionRules = dto.hasOptionRules;
		this.hasAttributes = dto.attributeGroups ? dto.attributeGroups.length > 0 : dto.hasAttributes;
		this.hasDivCatalogChoiceAttributes = dto.hasDivCatalogChoiceAttributes;
		this.hasLocations = dto.locationGroups ? dto.locationGroups.length > 0 : dto.hasLocations;
		this.hasDivCatalogChoiceLocations = dto.hasDivCatalogChoiceLocations;
		this.maxQuantity = dto.choiceMaxQuantity;
		this.description = dto.description;
		this.isHiddenFromBuyerView = dto.isHiddenFromBuyerView;
		this.priceHiddenFromBuyerView = dto.priceHiddenFromBuyerView;

		this._dto = dto;
	}

	get labelHeirarchy()
	{
		const groupLabel = this.parent.parent.parent.label;
		const subGroupLabel = this.parent.parent.label;
		const pointLabel = this.parent.label;

		return `${groupLabel} >> ${subGroupLabel} >> ${pointLabel} >> ${this.label}`;
	}

	constructor(dto: PhdApiDto.IDTreeChoiceDto)
	{
		if (dto == null)
		{
			throw new Error('dto must be specified');
		}

		this.dto = dto;
	}
}

export class DTAttributeGroupCollection
{
	attributeGroups: Array<AttributeGroupMarket>;
	divCatalogChoiceAttributeGroups: Array<AttributeGroupMarket>;
	locationGroups: Array<LocationGroupMarket>;
	divCatalogChoiceLocationGroups: Array<LocationGroupMarket>;
}

export class AttributeReassignment
{
	id: number = 0;
	treeVersionId: number = 0;
	toChoiceId: number = 0;
	dpChoiceOptionRuleAssocID: number = 0;
	attributeGroupId: number = 0;

	attributeGroupLabel: string = '';
	dPointLabel: string = '';
	choiceLabel: string = '';
	dpChoiceOptionRuleAssocDPChoiceId: number = 0;

	private _dto: PhdApiDto.IAttributeReassignment;

	get dto()
	{
		return this._dto;
	}

	set dto(dto)
	{
		this.id = dto.attributeReassignmentId;
		this.treeVersionId = dto.treeVersionId;
		this.toChoiceId = dto.toChoiceId;
		this.dpChoiceOptionRuleAssocID = dto.dpChoiceOptionRuleAssocID;
		this.attributeGroupId = dto.attributeGroupId;
		this.attributeGroupLabel = dto.attributeGroupLabel;
		this.dPointLabel = dto.dPointLabel;
		this.choiceLabel = dto.choiceLabel;
		this.dpChoiceOptionRuleAssocDPChoiceId = dto.dpChoiceOptionRuleAssocDPChoiceId;

		this._dto = dto;
	}

	constructor(dto?: PhdApiDto.IAttributeReassignment)
	{
		if (dto)
		{
			this.dto = dto;
		}
	}
}

export class PointChoiceDependent
{
	pointDependentIds: Array<number>;
	choiceDependentIds: Array<number>;
}

export interface ITreeSortList
{
	pointList: Array<PhdApiDto.IDTreePointDto>;
	choiceList: Array<PhdApiDto.IDTreeChoiceDto>;
}
