export class Template {
	templateId: number;
	documentName: string;
	displayName: string;
	version: number;
	marketId: number;
	templateTypeId: TemplateTypeEnum;
	displayOrder: number;

	constructor(dto = null) {
		if (dto) {
			Object.assign(this, dto);
 		}
	}
}

export enum TemplateTypeEnum {
	"Sales Agreement" = 1,
	"Addendum" = 2,
	"Cancel Form" = 3,
	"JIO" = 4
}

export interface ITemplateInfo {
	templateId: number;
	displayOrder: number;
	documentName: string;
	templateTypeId: TemplateTypeEnum;
}
