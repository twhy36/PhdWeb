import { PointStatus } from '../shared/models/point.model';

export const SubNavItems: Array<{ label: string, status: any, id: number }> = [
	{ label: "Create New Configuration", status: PointStatus.REQUIRED, id: 1 },
	{ label: "Quick Move-ins", status: PointStatus.CONFLICTED, id: 4 },
	{ label: "Choose Plan", status: PointStatus.CONFLICTED, id: 2 },
	{ label: "Choose Lot", status: PointStatus.CONFLICTED, id: 3 }
];

export const SpecSubNavItems: Array<{ label: string, status: any, id: number }> = [
	{ label: "Choose Plan", status: PointStatus.REQUIRED, id: 2 },
	{ label: "Choose Lot", status: PointStatus.REQUIRED, id: 3 }
];
