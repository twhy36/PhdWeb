import moment from 'moment';

import { HomeSite } from './homesite.model';

export class HomeSiteRelease
{
	releaseId?: number;

	date: moment.Moment;
	description: string;
	releaseRank: number;
	allHomeSites: Array<HomeSite>;
	associatedHomeSites: Array<number>;
	showHomeSites: boolean = false;

	minDate = moment({ hour: 0, minute: 0, seconds: 0 });

	//private _dataManager: ReleasesDataManager;
	constructor(dto: IHomeSiteReleaseDto, allHomeSites: Array<HomeSite>)
	{
		this.dto = dto;
		this.allHomeSites = allHomeSites;
	}

	private _dto: IHomeSiteReleaseDto;
	get dto()
	{
		return this._dto;
	}

	set dto(dto)
	{
		this._dto = dto;
		this.releaseId = dto.releaseId;
		this.date = moment(dto.releaseDate);
		this.description = dto.releaseDescription;
		this.releaseRank = dto.releaseRank;
		this.associatedHomeSites = dto.homeSitesAssociated;
	}

	get homeSites(): Array<HomeSite>
	{
		return this.allHomeSites.filter(hs => this.associatedHomeSites.indexOf(hs.commLbid) > -1);
	}

	get dateString(): string
	{
		let date = this.date;

		// get the date but without applying utc offset. Should handle the differences in dates caused by returning data vs saving.
		// Example: Server - "2018-06-21T00:00:00Z" 06/20/2018 vs Saving - "2018-06-21T00:00:00" 06/21/2018
		return moment.parseZone(date).format("M/DD/YYYY");
	}
}

export interface IHomeSiteReleaseDto
{
    releaseId?: number;
    financialCommunityId?: number;
	releaseDescription: string;
	releaseDate: string;
	releaseRank?: number;
	homeSitesAssociated: Array<number>;
}

export interface IHomeSiteReleaseSidePanelItem
{
	homeSiteRelease: HomeSiteRelease;
	homeSites: Array<HomeSite>;
}

export interface IReleaseDto
{
	releaseId: number;
	releaseDescription: string;
	releaseDate: string;
	releaseRank?: number;
	release_CommunityLotBlockAssoc: Array<number>;
}
