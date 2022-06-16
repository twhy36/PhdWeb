import { FinancialCommunity } from "./community.model";
import { Job } from "./job.model";

export class Lot implements ILot
{
	id: number;
	lotBlock: string;
	premium: number;
	lotStatusDescription: string;
	lotHandingAssocs: Array<LotHandingAssoc>;
	foundationType: string;
	lotBuildTypeDesc: string;
	planAssociations: Array<PlanAssociation>;
	monotonyRules: Array<MonotonyRuleLot>;
	jobs: Array<Job>;
	financialCommunityId: number;
	isMasterUnit: boolean;

	handings: Array<Handing>;

	constructor(dto: ILot)
	{
		for (let key of ['id', 'lotBlock', 'premium', 'lotStatusDescription', 'lotHandingAssocs', 'foundationType', 'lotBuildTypeDesc', 'planAssociations', 'monotonyRules', 'jobs', 'financialCommunityId', 'isMasterUnit'])
		{
			this[key] = dto[key];
		}

		this.handings = this.lotHandingAssocs ? this.lotHandingAssocs.map(h => h.handing) : [];
	}
}

export class LotExt extends Lot
{
	viewAdjacency: Array<ViewAdjacency>;
	streetAddress1: string;
	streetAddress2: string;
	city: string;
	stateProvince: string;
	postalCode: string;
	lotPhysicalLotTypeAssocs: Array<LotPhysicalLotTypeAssoc>;
	financialCommunity: FinancialCommunity;
	unitNumber: string;
	salesBldgNbr: string;
	alternateLotBlock: string;
	constructionPhaseNbr: string;
	salesPhase: SalesPhase;
	county: string;
	closeOfEscrow: Date;
	fieldManagerLotAssocs: Array<FieldManagerLotAssocs>;
	customerCareManagerLotAssocs: Array<CustomerCareManagerLotAssocs>;
	fieldManager: Array<ManagerName>;
	customerCareManager: ManagerName;

	physicalLotTypes: Array<PhysicalLotType>;

	constructor(dto: ILot)
	{
		super(dto);

		Object.assign(this, dto);

		this.fieldManager = this.fieldManagerLotAssocs && this.fieldManagerLotAssocs.length > 0 ? this.fieldManagerLotAssocs.map(fm => fm.fieldManager) : [];
		this.customerCareManager = this.customerCareManagerLotAssocs && this.customerCareManagerLotAssocs.length > 0 ? this.customerCareManagerLotAssocs[0].contact : null;
		this.physicalLotTypes = this.lotPhysicalLotTypeAssocs ? this.lotPhysicalLotTypeAssocs.map(p => p.physicalLotType) : [];
	}
}

export interface ILot
{
	id: number;
	lotBlock: string;
	premium: number;
	lotStatusDescription: string;
	lotHandingAssocs: Array<LotHandingAssoc>;
	foundationType: string;
	lotBuildTypeDesc: string;
	planAssociations: Array<PlanAssociation>;
	monotonyRules: Array<MonotonyRuleLot>;
	jobs: Array<Job>;
	isMasterUnit: boolean;
}

export interface SalesPhase
{
	salesPhaseName: string;
	salesPhasePlanPriceAssocs: Array<SalesPhasePlanPriceAssoc>;
}

export interface SalesPhasePlanPriceAssoc
{
	planId: number;
	price: number;
}

export interface ViewAdjacency
{
	id: number;
	description: string;
}

export interface LotHandingAssoc
{
	lotId: number;
	handingId: number;
	handing: Handing;
}

export interface Handing
{
	id: number;
	name: string;
}

export interface PlanAssociation
{
	id: number;
	planId: number;
	lotId: number;
	isActive: boolean;
}

export interface LotPhysicalLotTypeAssoc
{
	lotId: number;
	physicalLotTypeId: number;
	physicalLotType: PhysicalLotType;
}

export interface PhysicalLotType
{
	id: number;
	description: string;
}

export interface MonotonyRule
{
	edhLotId: number;
	relatedLotsElevationColorScheme: Array<MonotonyRuleLot>;
}

export interface MonotonyRuleLot
{
	edhLotId: number;
	edhPlanId: number;
	ruleType: MonotonyRuleType;
	colorSchemeAttributeCommunityIds: Array<number>;
	elevationDivChoiceCatalogId?: number;
	colorSchemeDivChoiceCatalogId?: number;
}

export interface ManagerName
{
	firstName: string;
	lastName: string;
}

export interface FieldManagerLotAssocs
{
	contactId: number;
	lotId: number;
	fieldManager: ManagerName;
}

export interface CustomerCareManagerLotAssocs
{
	contactId: number;
	lotId: number;
	contact: ManagerName;
}

export type MonotonyRuleType = "Elevation" | "ColorScheme" | "Both";
