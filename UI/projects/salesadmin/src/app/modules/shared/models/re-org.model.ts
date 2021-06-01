import { formatDate } from "@angular/common";
import { ContractTemplate } from "./contracts.model";

export class ReOrg
{
    reOrgId: number;
    sourceMarketId: number;
    targetMarketId: number;
    contractsMoved: number;
    contractsCopied: number;
    date: string;
    templateReOrgs: Array<TemplateReOrg>;
    sourceMarketName: string = '';
    targetMarketName: string = '';
    templates: Array<ReOrgedTemplate>;
    movedTemplates: Array<ReOrgedTemplate>;
    copiedTemplates: Array<ReOrgedTemplate>;

    constructor(dto: IReOrg = null)
	{
        if (dto)
        {
            this.sourceMarketId = dto.sourceMarketId;
            this.targetMarketId = dto.targetMarketId;
            this.date = formatDate(dto.createdUtcDate, 'short', 'en-US');
            this.contractsCopied = dto.templateReOrg.filter(temp => !temp.isMoved).length;
            this.contractsMoved = dto.templateReOrg.filter(temp => temp.isMoved).length;
            this.templateReOrgs = dto.templateReOrg;
            this.templates = dto.templateReOrg.map(templateReOrg => {
                templateReOrg.sourceTemplate.effectiveDate = formatDate(templateReOrg.sourceTemplate.effectiveDate, 'short', 'en-US');
                templateReOrg.sourceTemplate.expirationDate = formatDate(templateReOrg.sourceTemplate.expirationDate, 'short', 'en-US');
                templateReOrg.sourceTemplate.isMoved = templateReOrg.isMoved;
                return templateReOrg.sourceTemplate;
            });
            this.movedTemplates = this.templates? this.templates.filter(template => template.isMoved) : [];
            this.copiedTemplates = this.templates? this.templates.filter(template => !template.isMoved) : [];
            this.reOrgId = dto.reOrgId;
        }

    }
}

export class TemplateReOrg
{
    templateReOrgId: number;
    reOrgId: number;
    sourceTemplateId: number;
    targetTemplateId: number;
    isMoved: boolean;
    createdBy: string;
    createdUtcDate: Date;
    sourceTemplate: ReOrgedTemplate;
}

export class ReOrgedTemplate extends ContractTemplate
{
    isMoved: boolean
}

export interface IReOrg
{
    reOrgId: number;
    sourceMarketId: number;
    targetMarketId: number;
    createdBy: string;
    createdUtcDate: Date;
    templateReOrg: Array<TemplateReOrg>;
}
