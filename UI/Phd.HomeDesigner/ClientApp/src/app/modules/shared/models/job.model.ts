import { ILot, LotExt } from "./lot.model";
import { JobSalesAgreementAssoc } from './sales-agreement.model';
import { JobPlan } from "./plan.model";
import { ChangeOrderGroup } from "./job-change-order.model";

export interface IJob
{
	id?: number;
	financialCommunityId?: number;
	constructionStageName?: string;
	planId?: number;
	lotId?: number;
	handing?: string;
	jobChoices?: Array<JobChoice>;
	jobPlanOptions?: Array<JobPlanOption>;
	lot?: ILot;
	planCommunity?: JobPlan;
	jobChangeOrderGroups?: ChangeOrderGroup[];
	startDate?: Date;
	jobNonStandardOptions?: Array<JobNonStandardOption>;
	jobConstructionStageHistories?: JobConstructionStageHistory[];
	pendingConstructionStages?: PendingConstructionStage;
	jobSalesAgreementAssocs: JobSalesAgreementAssoc[];
}

export class Job
{
	id: number = 0;
	financialCommunityId: number = 0;
	constructionStageName: string = "";
	planId: number = 0;
	lotId: number = 0;
	handing: string = "";
	jobChoices: Array<JobChoice> = [];
	jobPlanOptions: Array<JobPlanOption> = [];
	lot: LotExt;
	plan: JobPlan;
	changeOrderGroups?: ChangeOrderGroup[] = [];
	startDate?: Date = null;
	jobNonStandardOptions?: Array<JobNonStandardOption> = [];
	jobConstructionStageHistories?: JobConstructionStageHistory[] = [];
	pendingConstructionStages?: PendingConstructionStage;
	jobSalesAgreementAssocs: JobSalesAgreementAssoc[] = [];

	constructor(dto: IJob = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.financialCommunityId = dto.financialCommunityId;
			this.constructionStageName = dto.pendingConstructionStages && dto.pendingConstructionStages.constructionStageName || dto.constructionStageName;
			this.planId = dto.planId;
			this.lotId = dto.lotId;
			this.handing = dto.handing;
			this.jobChoices = dto.jobChoices ? dto.jobChoices.map(c => new JobChoice(c)) : null;
			this.jobPlanOptions = dto.jobPlanOptions ? dto.jobPlanOptions.map(o => new JobPlanOption(o)) : null;
			this.lot = new LotExt(dto.lot);
			this.plan = dto.planCommunity;
			this.changeOrderGroups = dto.jobChangeOrderGroups ? dto.jobChangeOrderGroups.map(co => new ChangeOrderGroup(co)) : [];
			this.startDate = dto.startDate;
			this.jobNonStandardOptions = dto.jobNonStandardOptions ? dto.jobNonStandardOptions.map(o => new JobNonStandardOption(o)) : null;
			this.jobConstructionStageHistories = dto.jobConstructionStageHistories ? dto.jobConstructionStageHistories.map(x => new JobConstructionStageHistory(x)) : null;
			this.pendingConstructionStages = dto.pendingConstructionStages;
			this.jobSalesAgreementAssocs = dto.jobSalesAgreementAssocs ? dto.jobSalesAgreementAssocs : null;
		}
	}
}

export class JobConstructionStageHistory {
	id: number;
	constructionStageId: number;
	constructionStageStartDate: Date;

	constructor(dto?: JobConstructionStageHistory) {
		if (dto) {
			Object.assign(this, dto);
		}
	}
}

export class PendingConstructionStage {
	id: number;
	constructionStageName: string;
	constructionStageStartDate: Date;

	constructor(dto?: PendingConstructionStage) {
		if (dto) {
			Object.assign(this, dto);
		}
	}
}

export class JobChoice
{
	id: number;
	dpChoiceId: number;
	dpChoiceQuantity: number;
	dpChoiceCalculatedPrice: number;
	choiceLabel: string;
	divChoiceCatalogId: number;
	jobChoiceAttributes?: Array<JobChoiceAttribute>;
	jobChoiceLocations?: Array<JobChoiceLocation>;
	jobChoiceJobPlanOptionAssocs?: Array<JobChoiceJobPlanOptionAssoc>;

	constructor(dto?: JobChoice)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class JobChoiceAttribute
{
	id: number;
	attributeGroupCommunityId?: number;
	attributeCommunityId?: number;
	attributeName: string;
	attributeGroupLabel: string;
	manufacturer: string;
	sku: string;

	constructor(dto?: JobChoiceAttribute)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class JobChoiceLocation
{
	id: number;
	locationGroupCommunityId?: number;
	locationCommunityId?: number;
	quantity: number;
	locationName: string;
	locationGroupLabel: string;
	jobChoiceLocationAttributes?: Array<JobChoiceAttribute>;

	constructor(dto?: JobChoiceLocation)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class JobPlanOption
{
	id: number;
	planOptionId: number;
	listPrice: number;
	optionSalesName: string;
	optionDescription: string;
	integrationKey: string;
	optionQty: number;
	jobOptionTypeName: string;
	jobPlanOptionAttributes?: Array<JobPlanOptionAttribute>;
	jobPlanOptionLocations?: Array<JobPlanOptionLocation>;
	jobChoiceJobPlanOptionAssocs?: Array<JobChoiceJobPlanOptionAssoc>;

	constructor(dto?: JobPlanOption)
	{
		if (dto)
		{
			Object.assign(this, dto);

			this.integrationKey = dto['planOptionCommunity']['optionCommunity']['option']['financialOptionIntegrationKey'];
		}
	}
}

export class JobPlanOptionAttribute
{
	id: number;
	attributeGroupCommunityId?: number;
	attributeCommunityId?: number;
	jobPlanOptionAttributeLocations?: Array<JobPlanOptionLocation>;
	attributeName: string;
	attributeGroupLabel: string;
	manufacturer: string;
	sku: string;

	constructor(dto?: JobPlanOptionAttribute)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class JobPlanOptionLocation
{
	id: number;
	locationGroupCommunityId?: number;
	locationCommunityId?: number;
	quantity: number;
	locationName: string;
	locationGroupLabel: string;

	constructor(dto?: JobPlanOptionLocation)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class JobNonStandardOption
{
	id: number;
	name: string;
	description: string;
	financialOptionNumber: string;
	quantity: number;
	unitPrice: number;

	constructor(dto?: JobNonStandardOption)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class JobChoiceJobPlanOptionAssoc
{
	id: number;
	jobChoiceId: number;
	jobPlanOptionId: number;
	choiceEnabledOption: boolean;

	constructor(dto?: JobChoiceJobPlanOptionAssoc)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}
