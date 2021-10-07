export class HomeSite
{
	lotStatusDescription: HomeSiteStatus;
	premium: number;
	cost: number;
	phdLotWarranty: string;
	job: Job;
	constructor(dto: HomeSiteDtos.ILotDto)
	{
		this.dto = dto;
	}

	private _dto: HomeSiteDtos.ILotDto;
	get dto() { return this._dto; }
	set dto(dto: HomeSiteDtos.ILotDto)
	{
		this._dto = dto;
		this.lotStatusDescription = this.getStatus(dto.lotStatusDescription);
		this.phdLotWarranty = HomeSiteDtos.EdhWarrantyType[dto.edhWarrantyType];
		this.premium = dto.premium;
		this.cost = dto.lotCost;
	}

	get commLbid() { return this.dto.id; }
	get communityIntegrationKey() { return this.dto.communityIntegrationKey; }
	get phase() { return this.dto.phase; }
	get address() { return this.dto.address; }
	get lotBlock() { return this.dto.lotBlock; }
	get handing() { return this.dto.lotHandings; }
	get foundationType() { return this.dto.foundationType; }
	get facing() { return this.dto.facing; }
	get lotBuildTypeDescription() { return this.dto.lotBuildTypeDescription; }
	get lotType() { return this.dto.lotType; }
	get view() { return this.dto.view; }
	get isHiddenInTho() { return this.dto.isHiddenInTho; }

	private getStatus(status: string): HomeSiteStatus
	{
		switch (status)
		{
			case 'PendingRelease':
				return 'Pending Release';
			case 'PendingSale':
				return 'Pending Sale';
			default:
				return status as HomeSiteStatus;
		}
	}

	get hasRequiredInfo()
	{
		if (this.dto.lotType && this.dto.lotType.value
			&& this.dto.view && this.dto.view.value && this.dto.lotHandings && this.dto.lotHandings.length > 0
			&& this.dto.foundationType && this.dto.foundationType.length > 0 && this.phdLotWarranty !== undefined) {
			return true;
		}
		else {
			return false;
		}
	}
}

export class Job
{
	jobId: number;
	jobTypeName: string;
}

export type HomeSiteStatus = "Sold" | "Available" | "Unavailable" | "Closed" | "Pending Release" | "Pending Sale" | "Spec" | "Model" | "Spec Unavailable";
export type BuildType = "Spec" | "Model" | "Dirt";

export namespace HomeSiteDtos
{
	export interface IHomeSiteDto
	{
		commLbid: string;
		communityId: number;
		communityIntegrationKey: string;
		lotBlock: string;
		lotCost?: number;
		lotStatus: HomeSiteStatus;
		handing: Array<IHanding>;
		foundationType: string;
		facing: string;
		phase: string;
		lotType: ILabel;
		view: ILabel;

		address: IAddress;
		premium: number;
		plans: Array<string>;
		releaseId?: number;
	}

	export interface IHomeSiteEventDto
	{
		homesiteDto: ILotDto;
		lotBuildTypeUpdated: boolean;
	}

	export interface ILabel
	{
		id?: number;
		label?: string;
		value?: string;
	}

	export interface ILotDto
	{
		id: number;
		communityId: number;
		communityIntegrationKey: string;
		lotBlock: string;
		lotCost: number;
		lotStatusDescription: HomeSiteStatus;
		lotBuildTypeDescription: BuildType;
		lotHandings: Array<IHanding>;
		foundationType: string;
		facing: string;
		phase: string;
		lotType: ILabel;
		view: ILabel;
		edhWarrantyType: string;
		altLotBlock: string;
		isMasterUnit: boolean;
		isHiddenInTho: boolean;
		address: IAddress;
		premium: number;
		plans: Array<number>;
		job: Job;
	}
	export interface IHanding
	{
		lotId: number;
		handingId: number;
	}
	export interface IAddress
	{
		readonly streetAddress1: string;
		readonly streetAddress2: string;
		readonly city: string;
		readonly stateProvince: string;
		readonly postalCode: string;
	}

	export enum Handing
	{
		Left = 1,
		Right = 2,
		NA = 3
	}
	export enum Facing
	{
		North = 1,
		South,
		East,
		West,
		NorthEast,
		NorthWest,
		SouthEast,
		SouthWest,
		NA
	}
	export enum FoundationType
	{
		Slab = 1,
		Basement,
		Either
	}

	export enum EdhWarrantyType
	{
		'New Pulte Warranty' = 1,
		'Legacy Pulte' = 2,
		'Legacy Centex' = 3,
		'Model Warranty' = 4
	}
}
