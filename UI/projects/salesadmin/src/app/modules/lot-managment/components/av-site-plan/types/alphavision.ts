import { ElementRef } from '@angular/core';

export interface MapApiInitializer {
	new (
		guid: string,
		communityId: string | undefined,
		elementRef: ElementRef,
		genericMapCallback: (response: AlphaVisionGeneralResponse) => void,
		eventMapCallback: (response: AlphaVisionClickResponse) => void,
		mapStatuses: string[],
		planIds: string[],
		showLotNumbers: boolean
	) : MapApi;
}


export interface MapApi {
	selectLot: (id: string) => void;
	selectMap: (name: string, callback?: Function) => void;
	showLots: (lotBlock: string) => void;
	setZoom: (scale: number, callback?: Function) => void;
	zoomIn: (callback?: Function) => void;
	zoomOut: (callback?: Function) => void;
	getZoom: () => number;
	alphamapApiResult:
	{
		Siteplans: AlphaVisionAPIResultSiteplan[];
	};
}

/* eslint max-classes-per-file: ["error", 2] */
export interface AlphaVisionGeneralResponse {
	name: string;
	datatype: AlphaVisionDataType;
	eventtype: AlphaVisionEventType;
	data: AlphaVisionGeneralResponseData | string;
	siteplans?: AlphaVisionSitePlan[];
}

export interface AlphaVisionClickResponse {
	name: string;
	datatype: AlphaVisionDataType;
	eventtype: AlphaVisionEventType;
	data: AlphaVisionClickResponseData;
}

export interface AlphaVisionSelectMapResponse {
	data: AlphaVisionSitePlan;
	datatype: AlphaVisionDataType;
	eventtype: AlphaVisionEventType;
}

export interface AlphaVisionFilterLotsResponse {
	data: AlphaVisionFilterLotsResponseData;
	datatype: AlphaVisionDataType;
	eventtype: AlphaVisionEventType;
}

export interface AlphaVisionSelectLotResponse {
	data: AlphaVisionLotClickEvent;
	datatype: AlphaVisionDataType;
	eventtype: AlphaVisionEventType;
}

export interface AlphaVisionPlan {
	id: string;
	name: string;
	number: string;
}

export interface AlphaVisionLotClickEvent {
	lot: string;
	lotGroupName: string;
	lotImages: AlphaVisionImage[];
	lotLabel: string;
	lotNumber: string;
	plans: AlphaVisionPlan[];
	status: string;
	lotId: number;
}

export interface AlphaVisionLotDetails {
	Lot: string;
	LotId: number;
}

export interface AlphaVisionImage {
	name: string;
	url: string;
}

export interface AlphaVisionAmenity {
	zoneName: string;
	medias: AlphaVisionImage[];
}

export interface AlphaVisionSitePlan {
	amenities: AlphaVisionAmenity[];
	availablePlans: AlphaVisionPlan[];
	availableStatus: string[];
	lots: AlphaVisionLotClickEvent[];
	mapName: string;
	siteplans: AlphaVisionSitePlan[];
}

export interface AlphaVisionAPIResultSiteplan {
	SiteplanName: string;
	LotDetails: AlphaVisionLotDetails[];
}

export interface AlphaVisionLotCounts {
	HomesiteLotsCount: number;
	AvailableHomesiteLotsCount: number;
	QmiLotsCount: number;
}

export enum AlphaVisionDataType {
	MasterMap = 'mastermap',
	SitePlan = 'siteplan',
	Error = 'error',
	Lot = 'lot',
	Amenity = 'amenity',
	Plan = 'plan',
	ZoomLevel = 'zoom_level',
	SVG = 'svg',
}

export enum AlphaVisionEventType {
	Init = 'init',
	Click = 'click',
	ShowLots = 'showLots()',
	ShowPlans = 'showPlans()',
	FilterLots = 'filterLots()',
	SelectLot = 'selectLot()',
	SelectMap = 'selectMap()',
	Reset = 'reset()',
	ExportStaticSVG = 'exportStaticSVG()',
}

export enum AlphaVisionLotStatusType {
	Available = 'Available',
	Model = 'Model',
	QuickMoveIn = 'Quick Move In',
	Sold = 'Sold',
	Unreleased = 'Unreleased',
	BogusStatus = 'BogusStatus',
}

export interface AlphaVisionGeneralResponseData extends AlphaVisionSitePlan, AlphaVisionPlan, AlphaVisionLotDetails { }

export interface AlphaVisionClickResponseData extends AlphaVisionLotClickEvent, AlphaVisionAmenity, AlphaVisionSitePlan { }

export interface AlphaVisionFilterLotsResponseData extends AlphaVisionLotClickEvent, AlphaVisionSitePlan { }
