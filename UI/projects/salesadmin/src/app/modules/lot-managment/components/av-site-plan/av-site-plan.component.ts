import {
	AfterViewInit,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	ViewChild,
} from '@angular/core';
import { Lot } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import {
	AlphaVisionAPIResultSiteplan,
	AlphaVisionClickResponse,
	AlphaVisionDataType,
	AlphaVisionEventType,
	AlphaVisionGeneralResponse,
	AlphaVisionLotStatusType,
	MapApi,
	MapApiInitializer,
} from './types/alphavision';
import { ComponentChanges } from './types/componentChanges';
import * as _ from 'lodash';

declare let AVSiteplan: MapApiInitializer;

@Component({
	selector: 'av-site-plan',
	templateUrl: './av-site-plan.component.html',
	styleUrls: ['./av-site-plan.component.css'],
})
export class AvSitePlanComponent implements AfterViewInit, OnChanges
{
	@Input() webCommunityId?: string;

	@Input() selectedLot?: Lot;

	@Input() filteredLots: Lot[] = [];

	@Input() zoomLevel?: number = 0;

	@Input() showLotNumbers?: boolean = false;

	@Output() lotSelectedCallback = new EventEmitter<string | null>();

	mapAPI?: MapApi;

	@ViewChild('divSitePlan', { static: false }) divSitePlan?: ElementRef;

	mapInitStatuses: AlphaVisionLotStatusType[] = [];

	mapInitPlanIds: string[] = [];

	filteredLotBlocks: string[] = [];

	lotFlashInterval = 0;

	mapSelectedLot = '';

	mapLoaded = false;

	errorMessage: string | null = null;

	ngAfterViewInit(): void
	{
		if (this.webCommunityId != null)
		{
			this.filteredLotBlocks = this.filteredLots.map((lot) => lot.lotBlock);
			this.mapAPI = this.instantiateAVSiteMap();
		}
	}

	ngOnChanges(changes: ComponentChanges<AvSitePlanComponent>)
	{
		const lots = changes?.filteredLots;
		if (lots
			&& lots.firstChange === false
			&& (lots?.previousValue.length !== lots.currentValue.length)
		)
		{
			this.filteredLotBlocks = this.filteredLots.map((lot) => lot.lotBlock);
			this.displayAndSelectLots();
		}

		const val = changes?.selectedLot?.currentValue?.lotBlock;
		if (
			val
			&& changes?.selectedLot?.firstChange === false
		)
		{
			this.selectLotOnMap(val);
		}

		const level = changes?.zoomLevel;
		if (level && level?.firstChange === false)
		{
			if ((level?.currentValue || 0) > (level?.previousValue || 0)) this.mapAPI?.zoomIn();
			else this.mapAPI?.zoomOut();
		}
	}

	instantiateAVSiteMap(): MapApi
	{
		return new AVSiteplan(
			environment.alphaVisionBuilderGuid, // Builder GUID
			this.webCommunityId, // Web Community ID
			this.divSitePlan?.nativeElement, // Parent DOM Element
			(res: AlphaVisionGeneralResponse) => 
			{
				if (res.eventtype === AlphaVisionEventType.Init)
				{
					this.mapLoaded = true;
					if (res.datatype === AlphaVisionDataType.Error)
					{
						this.errorMessage = res.data as string;
					}
					if (res.datatype === AlphaVisionDataType.MasterMap)
					{
						this.mapAPI?.selectMap(this.getSubMaps()[0]);
					}
					else
					{
						this.displayAndSelectLots();
					}
				}
			}, // Generic Map Callback
			(res: AlphaVisionClickResponse) => 
			{
				this.selectLot(res);
			}, // Event Map Callback (lot click/ amenity click)
			this.mapInitStatuses, // Status
			this.mapInitPlanIds, // Plans
			this.showLotNumbers,
		);
	}

	getSubMaps(): string[]
	{
		return _.flatMap(
			this.mapAPI?.alphamapApiResult.Siteplans,
			(siteplan: AlphaVisionAPIResultSiteplan) => siteplan.SiteplanName
		) || [];
	}

	displayAndSelectLots()
	{
		this.showLots(this.filteredLotBlocks);
		this.selectLotOnMap(this.selectedLot?.lotBlock || '');
	}

	showLots(lotIds: string[])
	{
		if (lotIds.length > 0)
		{
			this.mapAPI?.showLots(lotIds);
		}
		else
		{
			// eslint-disable-next-line max-len
			this.mapAPI?.showLots(['Unfortunately, passing in an empty array of string ids to the mapAPI showLots will call the mapAPI resetLots method, which will show all lots. Since we actually dont want to show any lots if the filtered lots are empty, we instead pass in an array of ids that will most probably not exist.']);
		}
	}

	selectLotOnMap(id: string)
	{
		if (this.mapLoaded && this.mapSelectedLot !== id)
		{
			if (this.filteredLotBlocks.includes(id))
			{
				this.mapSelectedLot = id;
				this.mapAPI?.selectLot(id);
				this.flashLot(id);
			}
		}
	}

	selectLot(info: AlphaVisionClickResponse)
	{
		const { status } = info.data;
		if (status === AlphaVisionLotStatusType.Available || status === AlphaVisionLotStatusType.QuickMoveIn)
		{
			this.lotSelectedCallback.emit(info.data.lot);
		}
		else
		{
			this.lotSelectedCallback.emit(null);
		}
	}

	flashLot(lotId: string)
	{
		const filteredLotsWithoutId = this.filteredLotBlocks.filter(id => id !== lotId);
		window.clearInterval(this.lotFlashInterval);
		let counter = 8;
		this.lotFlashInterval = window.setInterval(() => 
		{
			counter -= 1;
			if (counter % 2 === 0)
			{
				this.showLots(this.filteredLotBlocks);
			}
			else
			{
				this.showLots(filteredLotsWithoutId);
			}
			if (counter === 0)
			{
				window.clearInterval(this.lotFlashInterval);
			}
		}, 300);
	}
}
