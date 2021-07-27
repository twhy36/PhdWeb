import { ILot, LotExt } from "./lot.model";
import { JobSalesAgreementAssoc } from './sales-agreement.model';
import { JobPlan } from "./plan.model";
import { ChangeOrderGroup } from "./job-change-order.model";
import * as moment from 'moment';

export interface IJob
{
	id?: number;
	financialCommunityId?: number;
	constructionStageName?: string;
	planId?: number;
	lotId?: number;
	handing?: string;
	warrantyTypeDesc?: string;
	jobChoices?: Array<JobChoice>;
	jobPlanOptions?: Array<JobPlanOption>;
	lot?: ILot;
	planCommunity?: JobPlan;
	jobChangeOrderGroups?: ChangeOrderGroup[];
	startDate?: Date;
	jobNonStandardOptions?: Array<JobNonStandardOption>;
	jobConstructionStageHistories?: JobConstructionStageHistory[];
	pendingConstructionStages?: PendingConstructionStage;
	projectedFinalDate?: Date;
	jobSalesInfos: SpecInformation;
	projectedDates?: ProjectedDate;
	jobSalesAgreementAssocs: JobSalesAgreementAssoc[];
	jobTypeName: string;
	createdBy: string;
}

export class Job
{
	id: number = 0;
	financialCommunityId: number = 0;
	constructionStageName: string = "";
	planId: number = 0;
	lotId: number = 0;
	handing: string = "";
	warrantyTypeDesc: string = "";
	jobChoices: Array<JobChoice> = [];
	jobPlanOptions: Array<JobPlanOption> = [];
	lot: LotExt;
	plan: JobPlan;
	changeOrderGroups?: ChangeOrderGroup[] = [];
	startDate?: Date = null;
	jobNonStandardOptions?: Array<JobNonStandardOption> = [];
	jobConstructionStageHistories?: JobConstructionStageHistory[] = [];
	pendingConstructionStages?: PendingConstructionStage;
	projectedFinalDate?: Date = null;
	jobSalesInfo?: SpecInformation;
	projectedDates?: ProjectedDate;
	jobSalesAgreementAssocs: JobSalesAgreementAssoc[] = [];
	jobTypeName: string;
	createdBy: string;

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
			this.warrantyTypeDesc = dto.warrantyTypeDesc;
			this.jobChoices = dto.jobChoices ? dto.jobChoices.map(c => new JobChoice(c)) : null;
			this.jobPlanOptions = dto.jobPlanOptions ? dto.jobPlanOptions.map(o => new JobPlanOption(o)) : null;
			this.lot = new LotExt(dto.lot);
			this.plan = dto.planCommunity;
			this.changeOrderGroups = dto.jobChangeOrderGroups ? dto.jobChangeOrderGroups.map(co => new ChangeOrderGroup(co)) : [];
			this.startDate = dto.startDate;
			this.jobNonStandardOptions = dto.jobNonStandardOptions ? dto.jobNonStandardOptions.map(o => new JobNonStandardOption(o)) : null;
			this.jobConstructionStageHistories = dto.jobConstructionStageHistories ? dto.jobConstructionStageHistories.map(x => new JobConstructionStageHistory(x)) : null;
			this.pendingConstructionStages = dto.pendingConstructionStages;
			this.projectedFinalDate = new Date(moment.utc(dto.projectedFinalDate).format('L'));
			this.jobSalesInfo = dto.jobSalesInfos ? dto.jobSalesInfos[0] : null;
			this.projectedDates = dto.projectedDates ? new ProjectedDate(dto.projectedDates) : null;
			this.jobSalesAgreementAssocs = dto.jobSalesAgreementAssocs ? dto.jobSalesAgreementAssocs : null;
			this.jobTypeName = dto.jobTypeName;
			this.createdBy = dto.createdBy
		}
	}
}

export class JobConstructionStageHistory
{
	id: number;
	constructionStageId: number;
	constructionStageStartDate: Date;

	constructor(dto?: JobConstructionStageHistory)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class PendingConstructionStage
{
	id: number;
	constructionStageName: string;
	constructionStageStartDate: Date;

	constructor(dto?: PendingConstructionStage)
	{
		if (dto)
		{
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
	outForSignatureDate?: Date;

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
	imageUrl?: string;

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
	outForSignatureDate?: Date;

	constructor(dto?: JobPlanOption)
	{
		if (dto)
		{
			Object.assign(this, dto);

			if(	dto['planOptionCommunity'] 
				&& dto['planOptionCommunity']['optionCommunity']
				&& dto['planOptionCommunity']['optionCommunity']['option'])
			{
				this.integrationKey = dto['planOptionCommunity']['optionCommunity']['option']['financialOptionIntegrationKey'];
			}
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


export class SpecInformation
{
	jobId: number;
	isPublishOnWebSite: boolean;
	webSiteDescription: string;
	webSiteAvailableDate: Date;
	discountAmount: number;
	discountExpirationDate: Date;
	isHotHomeActive: boolean;
	hotHomeBullet1: string;
	hotHomeBullet2: string;
	hotHomeBullet3: string;
	hotHomeBullet4: string;
	hotHomeBullet5: string;
	hotHomeBullet6: string;
	numberFullBathOverride: number;
	numberHalfBathOverride: number;
	numberBedOverride: number;
	squareFeetOverride: number;
	numberGarageOverride: number;
	specPrice: number;

	constructor(dto?: SpecInformation)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ProjectedDate
{
	jobId: number;
	projectedStartDate: Date;
	projectedFrameDate: Date;
	projectedSecondDate: Date;
	projectedFinalDate: Date;

	constructor(dto?: ProjectedDate)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}
