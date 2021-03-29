export interface ISearchResults
{
	value?: Array<ISearchResult>;
}

export class SearchResult
{
	buildType: string;
	city: string;
	country: string;
	financialCommunity: string;
	foundationType: string;
	homesiteNumber: string;
	homesiteType: string;
	id: number;
	lotStatusDescription: string;
	plans: Array<SearchResultItem>;
	postalCode: string;
	premium: number;
	salesAgreements: Array<ISearchResultAgreement> = [];
	scenarios: Array<SearchResultItem>;
	stateProvince: string;
	streetAddress1: string;
	streetAddress2: string;
	unitNumber: string;
	jobId: number;
	jobCreatedBy: string;
	jobTypeName: string;
	buyers: Array<Buyer>;
	activeChangeOrder: ActiveChangeOrder;
	activeChangeOrderText: string;
	buildTypeDisplayName: string;

	get buyerString(): string {
		return this.buyers && this.buyers.length > 0 ? this.buyers.map(fm => fm.firstName + ' ' + fm.lastName).join(', ') : '';
	}
	constructor(dto: ISearchResult)
    {
		this.buildType = dto.lotBuildTypeDesc || 'Dirt';
		this.buildTypeDisplayName = dto.lotBuildTypeDesc || 'Dirt';
		this.city = dto.city || null;
		this.country = dto.country || null;
		this.financialCommunity = dto.financialCommunity && dto.financialCommunity.name || null;
		this.foundationType = dto.foundationType;
		this.homesiteNumber = dto.lotBlock || null;
		this.homesiteType = dto.lotPhysicalLotTypeAssocs &&
			dto.lotPhysicalLotTypeAssocs.length > 0 &&
			dto.lotPhysicalLotTypeAssocs[0].physicalLotType ? dto.lotPhysicalLotTypeAssocs[0].physicalLotType.description : null;
		this.id = dto.id || null;
        this.lotStatusDescription = dto.lotStatusDescription || null;
        if ((dto.lotStatusDescription === 'Sold' || dto.lotStatusDescription === 'PendingSale' || (dto.lotBuildTypeDesc === 'Spec' && dto.lotStatusDescription === 'Available')) && dto.jobs.length > 0) {
			const item: SearchResultItem = new SearchResultItem();
			item.name = dto.jobs[0].planCommunity && dto.jobs[0].planCommunity.planSalesName || null;
			item.id = dto.jobs[0].planCommunity && dto.jobs[0].planCommunity.id || null;
			this.plans = [item];
		}
		else {
			this.plans = dto.planAssociations && dto.planAssociations.filter(p => p.isActive).map(p => {
				const item: SearchResultItem = new SearchResultItem();
				item.name = p.planCommunity && p.planCommunity.planSalesName || null;
				item.id = p.planCommunity && p.planCommunity.id || null;
				return item;
			}) || null;
		}
		this.postalCode = dto.postalCode || null;
		this.premium = dto.premium || null;
		// Get the sales agreements for each jobChangeOrderGroupSalesAgreementAssocs in each changeOrderGroup in each job

		dto.jobs.map(job =>
		{
			this.jobId = job.id;
			this.jobCreatedBy = job.createdBy;
			this.jobTypeName = job.jobTypeName
			if (dto.lotBuildTypeDesc === 'Spec' && job.jobTypeName === 'Model')
			{
				this.buildTypeDisplayName = 'Model';
			}

			if (dto.lotBuildTypeDesc === 'Spec')
			{
				const activeCOG = job.jobChangeOrderGroups.find(cog => ['Pending', 'Signed', 'OutforSignature', 'Rejected'].indexOf(cog.salesStatusDescription) !== -1);

				let buyerChangeOrders = activeCOG ? activeCOG.jobChangeOrders.filter(jco => jco.jobChangeOrderTypeDescription === 'BuyerChangeOrder') : [];

				buyerChangeOrders.forEach(bco =>
				{
					this.buyers = bco.jobSalesChangeOrderBuyers.map(buyer => ({ firstName: buyer.firstName, lastName: buyer.lastName, sortKey: buyer.sortKey, isPrimaryBuyer: buyer.isPrimaryBuyer }))
						.filter(buyer => buyer.firstName !== null && buyer.lastName !== null)
						.sort((a, b) => a.isPrimaryBuyer ? -1 : (b.isPrimaryBuyer ? 1 : a.sortKey - b.sortKey));
				})
			}

			job.jobSalesAgreementAssocs.map(jsa =>
			{
				if (jsa.salesAgreement && jsa.salesAgreement.id) {
					jsa.salesAgreement.isOnFinalLot = !jsa.salesAgreement.jobSalesAgreementAssocs 
						|| !jsa.salesAgreement.jobSalesAgreementAssocs.length
						|| this.jobId === jsa.salesAgreement.jobSalesAgreementAssocs[0].jobId;

					if (!jsa.salesAgreement.salesAgreementNumber)
					{
						jsa.salesAgreement.salesAgreementNumber = jsa.salesAgreement.id.toString().padStart(6, '0');
					}
					this.salesAgreements.push(jsa.salesAgreement);
				}
			});
			if (job.jobChangeOrderGroups.some(cog => ['Pending', 'Signed', 'OutforSignature', 'Rejected'].indexOf(cog.salesStatusDescription) !== -1))
			{
				if (dto.lotBuildTypeDesc === 'Spec' || dto.lotBuildTypeDesc === 'Model')
				{
					let lastSequence = -1;
					let jioIndex = job.jobChangeOrderGroups.findIndex(cog => cog.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Job Initiation Change Order');
					if (jioIndex > -1)
					{
						job.jobChangeOrderGroups = job.jobChangeOrderGroups.slice(0, jioIndex + 1)
					}
					for (let i = job.jobChangeOrderGroups.length - 1; i > -1; i--)
					{
						
						if (!job.jobChangeOrderGroups[i].changeOrderGroupSequence || (job.jobChangeOrderGroups[i].changeOrderGroupSequence === 0 && i !== 0))
						{
							job.jobChangeOrderGroups[i].changeOrderGroupSequence = ++lastSequence;
						}
						else
						{
							lastSequence = job.jobChangeOrderGroups[i].changeOrderGroupSequence;
						}
					}
				}
				const activeCOG = job.jobChangeOrderGroups.find(cog => ['Pending', 'Signed', 'OutforSignature', 'Rejected'].indexOf(cog.salesStatusDescription) !== -1
					&& cog.jobChangeOrderGroupDescription !== 'Pulte Home Designer Generated Job Initiation Change Order'
					&& cog.jobChangeOrderGroupDescription !== 'Pulte Home Designer Generated Spec Customer Change Order');
					
				if (activeCOG)
				{
					this.activeChangeOrder = {
						changeOrderDescription: activeCOG.jobChangeOrderGroupDescription,
						changeOrderNumber: activeCOG.jobChangeOrderGroupSalesAgreementAssocs.length > 0 ? (activeCOG.jobChangeOrderGroupSalesAgreementAssocs[0].changeOrderGroupSequence || '').toString() : '0',
						changeOrderStatus: activeCOG.salesStatusDescription,
						SalesAgreementId: activeCOG.jobChangeOrderGroupSalesAgreementAssocs.length > 0 ? activeCOG.jobChangeOrderGroupSalesAgreementAssocs[0].salesAgreementId : null
					};
					this.activeChangeOrderText = 'CO# ' +
						(activeCOG.jobChangeOrderGroupSalesAgreementAssocs.length > 0 ? (activeCOG.jobChangeOrderGroupSalesAgreementAssocs[0].changeOrderGroupSequence || '').toString() 
						: activeCOG.changeOrderGroupSequence ? activeCOG.changeOrderGroupSequence.toString() : '0') +
						' - ' + activeCOG.salesStatusDescription + ' - ' + activeCOG.jobChangeOrderGroupDescription;
				}
			}
		});

		this.scenarios = dto.scenarios && dto.scenarios.map(s => new SearchResultItem(s)) || null;
		this.stateProvince = dto.stateProvince || null;
		this.streetAddress1 = dto.streetAddress1 || null;
		this.streetAddress2 = dto.streetAddress2 || null;
		this.unitNumber = dto.unitNumber || null;
	}
}

export class SearchResultItem
{
	id: number;
	name: string;

	constructor(dto?: ISearchResultItem)
	{
		if (dto)
		{
			this.id = dto.id || null;
			this.name = dto.name || null;
		}
	}
}

export interface ISearchResultItem
{
	id: number,
	name: string
}

export interface ISearchResult
{
	city: string,
	country: string,
	financialCommunity: ISearchResultFinacialCommunity,
	foundationType: string,
	id: number,
	jobs: Array<ISearchResultJob>,
	lotBlock: string,
	lotBuildTypeDesc: string,
	lotPhysicalLotTypeAssocs: Array<{ physicalLotType: { description: string } }>,
	lotStatusDescription: string,
	planAssociations: Array<ISearchResultPlanAssociation>,
	postalCode: string,
	premium: number,
	scenarios: Array<ISearchResultItem>,
	stateProvince: string,
	streetAddress1: string,
	streetAddress2: string,
	unitNumber: string
}

export interface ISearchResultFinacialCommunity
{
	id: number,
	marketId: number,
	name: string,
	number: string,
	salesCommunity: Array<{ id: number, name: string, number: string }>,
	salesCommunityId: number
}

export interface ISearchResultPlanAssociation
{
	isActive: true,
	planCommunity: { id: number, planSalesName: string },
}

export interface ISearchResultJob
{
	id: number;
	createdBy: string;
	jobTypeName: string;
	jobSalesAgreementAssocs: Array<IJobSalesAgreementAssocs>;
	jobChangeOrderGroups: Array<IJobChangeOrderGroup>;
	planCommunity: { id: number, planSalesName: string };
}

export interface IJobSalesAgreementAssocs
{
	id: number;
	isActive: boolean;
	salesAgreement: ISearchResultAgreement;
	salesAgreementId: number;
	jobId: number;
}

export interface IJobChangeOrderGroup
{
	id: number;
	jobChangeOrderGroupDescription: string;
	salesStatusDescription: string;
	jobChangeOrderGroupSalesAgreementAssocs: Array<ChangeOrderGroupSalesAgreementAssoc>;
	jobChangeOrders: Array<JobChangeOrder>;
	jobId: number;
	changeOrderGroupSequence: number;
}

export interface ISearchResultAgreement
{
	id: number,
	salesAgreementNumber: string,
	status: string;
	jobSalesAgreementAssocs: Array<IJobSalesAgreementAssocs>;
	isOnFinalLot: boolean;
}

export class SearchEntities
{
	financialCommunity: string;
	jobs: string;
	jobSalesAgreementAssocs: string;
	lots: string;
	physicalLotTypes: string;
	planAssociations: string;
	planCommunity: string;
	salesAgreement: string;
	salesCommunity: string;
	scenarios: string;
	viewAdjacencies: string;
	jobChangeOrderGroup: string;

	constructor(dto = null)
	{
		if (dto)
		{
			for (let n in dto)
			{
				if (this.hasOwnProperty(n))
				{
					this[n] = dto[n];
				}
			}
		}
	}
}

export interface IFilterItems
{
	items: Array<IFilterItem>,
	collection?: string
}

export interface IFilterItem
{
	equals?: boolean,
	name: string,
	andOr?: 'and' | 'or',
	value: string | number
}

export class Buyer {
	firstName: string;
	lastName: string;
	sortKey?: number;
	isPrimaryBuyer?: boolean;
}

export class ActiveChangeOrder {
	changeOrderNumber: string;
	changeOrderStatus: string;
	changeOrderDescription: string;
	SalesAgreementId: number;
}

export class ChangeOrderGroupSalesAgreementAssoc {
	changeOrderGroupSequence: number;
	salesAgreementId: number;
}

export class JobChangeOrder {
	id: number;
	jobChangeOrderGroupId: number;
	jobChangeOrderTypeDescription: string;
	jobSalesChangeOrderBuyers: Array<JobSalesChangeOrderBuyers>;
}

export class JobSalesChangeOrderBuyers {
	id: number;
	jobChangeOrderId: number;
	firstName: string;
	lastName: string;
	isPrimaryBuyer: boolean;
	sortKey: number;
}
