import { PointStatus } from 'phd-common';

export enum PhdSubMenu
{
    ConfigurationName = 1,
	ChoosePlan = 2,
	ChooseLot = 3,
	QuickMoveIns = 4
}

export const SubNavItems: Array<{ label: string, status: any, id: number }> = [
	{ label: 'Configuration Name', status: PointStatus.REQUIRED, id: PhdSubMenu.ConfigurationName },
	{ label: 'Choose Plan', status: PointStatus.CONFLICTED, id: PhdSubMenu.ChoosePlan },
	{ label: 'Choose Lot', status: PointStatus.CONFLICTED, id: PhdSubMenu.ChooseLot },
	{ label: 'Quick Move-ins', status: PointStatus.CONFLICTED, id: PhdSubMenu.QuickMoveIns }
];

export const SpecSubNavItems: Array<{ label: string, status: any, id: number }> = [
	{ label: 'Choose Plan', status: PointStatus.REQUIRED, id: PhdSubMenu.ChoosePlan },
	{ label: 'Choose Lot', status: PointStatus.REQUIRED, id: PhdSubMenu.ChooseLot }
];
