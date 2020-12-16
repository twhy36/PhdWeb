import { OptionImage } from './tree.model';

export interface PlanOption
{
	id: number;
	name: string;
	description: string;
	communityId: number;
	planId: number;
	maxOrderQuantity: number;
	listPrice: number;
	isActive: boolean;
	isBaseHouse: boolean;
	calculatedPrice: number;
	isBaseHouseElevation: boolean;
	attributeGroups: number[],
	locationGroups: number[],
	financialOptionIntegrationKey: string;
	optionImages: OptionImage[];
}

export interface OptionCommunityImage
{
	id: number;
	optionCommunityId: number;
	optionMarketImageId: number;
	imageUrl: string;
	sortKey: number;
}

export interface PlanOptionDto
{
	planOptionId: number;
	price: number;
	quantity: number;
}
