import { FinancialCommunity } from './financialCommunity.model';
import { HomeSite, HomeSiteDtos } from './homesite.model';
import { IPlanDto } from './plan.model';

export class FinancialCommunityViewModel
{
	readonly dto: FinancialCommunity;

	constructor(dto: FinancialCommunity)
	{
		this.dto = dto;
	}

	inited = false;
	lots: Array<HomeSiteViewModel> = [];
	plans: Array<PlanViewModel> = [];

	get marketId() { return this.dto.marketId; }
	get id() { return this.dto.id; }
	get name() { return this.dto.name; }
	get key() { return this.dto.key; }
	get isActive() { return (this.dto.salesStatusDescription === "Active" || this.dto.salesStatusDescription === "New"); }

	static sorter(left: FinancialCommunityViewModel, right: FinancialCommunityViewModel): number
	{
		return left.name.localeCompare(right.name);
	}
}

export class HomeSiteViewModel extends HomeSite
{
	readonly community: FinancialCommunity;
	// properties custom to this page
	plans: Array<number> = [];
	plansRef: Array<PlanViewModel> = [];

	constructor(dto: HomeSiteDtos.ILotDto, community: FinancialCommunity)
	{
		super(dto);

		this.community = community;

		this.plans = dto.plans;
	}

	static sorter(left: HomeSiteViewModel, right: HomeSiteViewModel): number
	{
		if (left.community === right.community)
		{
			return left.lotBlock.localeCompare(right.lotBlock);
		}
		return left.community.name.localeCompare(right.community.name);
	}
}

export class PlanViewModel
{
	// interface properties
	id: number;
	name: string;
	salesName: string;

	// properties custom to this page
	displayName: string;
	seriesName: string;
	lots: Array<HomeSiteViewModel> = [];
	financialMarketId: string;
	financialCommunityId: number;
	financialCommunityName: string;
	details: string;
	loadingLots: boolean = true;

	constructor(dto: IPlanDto, selectedCommunity: FinancialCommunityViewModel)
	{
		if (dto)
		{
			this.id = dto.id;
			this.name = dto.salesName;
			this.salesName = dto.salesName;
			this.seriesName = ""; // todo: get series from edh when it becomes available
			this.displayName = `${dto.salesName} - (${dto.integrationKey})`;
			this.financialCommunityId = dto.communityId;
			this.details = `${dto.numBed}/BD ${dto.numFullBath}/BA ${dto.numHalfBath}/Half BA ${dto.squareFeet} SF`;
			this.financialCommunityName = selectedCommunity.name;
		}
	}

	static sorter(left: PlanViewModel, right: PlanViewModel): number
	{
		if (left.financialCommunityName === right.financialCommunityName)
		{
			return left.salesName.localeCompare(right.salesName);
		}
		return left.financialCommunityName.localeCompare(right.financialCommunityName);
	}
}

export type AssignmentMode = "Plan" | "Lot";

export interface ITag
{
	id: number;
	label: string;
}

export interface IFilterItem
{
	id: number;
	name: string;
}
