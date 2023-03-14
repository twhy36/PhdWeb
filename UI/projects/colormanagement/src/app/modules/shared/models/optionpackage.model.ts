export interface IOptionPackage {
	bundleId: number,
	bundleCommonId: number,
	edhFinancialCommunityId: number,
	name: string,
	presentationOrder: number,
	isCommon: number,
	dragPlaceholder: string
}

export interface OptionPackageDto {
	bundleId: number;
	bundleCommonId: number | null;
	name: string;
	edhFinancialCommunityId: number;
	presentationOrder: number | null;
	createdBy: string;
	createdUtcDate: string;
	lastModifiedBy: string;
	lastModifiedUtcDate: string;
	isCommon: boolean | null;
	//optionPlanPackages: OptionPlanPackage[]; 
}