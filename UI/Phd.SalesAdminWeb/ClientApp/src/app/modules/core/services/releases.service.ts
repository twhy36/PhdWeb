import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, EMPTY as empty, of, forkJoin } from 'rxjs';
import { tap, flatMap, catchError, map } from 'rxjs/operators';

import { HomeSiteService } from './homesite.service';
import { SettingsService } from './settings.service';

import { FinancialCommunity } from '../../shared/models/financialCommunity.model';
import { HomeSite } from '../../shared/models/homesite.model';
import { HomeSiteRelease, IHomeSiteReleaseDto } from '../../shared/models/homesite-releases.model';
import { Settings } from '../../shared/models/settings.model';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class ReleasesService
{
    private _community: FinancialCommunity;

    get currentCommunity(): FinancialCommunity
	{
		return this._community;
	}

    set currentCommunity(community: FinancialCommunity)
	{
		this._community = community;
	}

	private _homeSites: Array<HomeSite>;
	get homeSites(): Array<HomeSite>
	{
		return this._homeSites;
	}

	set homeSites(homeSites: Array<HomeSite>)
	{
		this._homeSites = homeSites;
	}

	hasInitialized: boolean = false;

	private _releases: Array<HomeSiteRelease> = [];
	get releases(): Array<HomeSiteRelease>
	{
		return this._releases;
	}

	set releases(hsReleases: Array<HomeSiteRelease>)
	{
		this._releases = hsReleases;
	}

	constructor(
		private _homeSiteService: HomeSiteService,
		private _http: HttpClient,
	)
	{ }

    trySetCommunity(community: FinancialCommunity): Observable<void>
    {
		if (community != null)
		{
			this.currentCommunity = community;

            const obs = this.init().pipe(
                tap(() => this.hasInitialized = true)
            );

			return obs;
		}
		else
		{
			return of(null);
		}
	}

	private init(): Observable<void>
    {
		const community = this.currentCommunity;

        const homeSiteDtoPromise = this._homeSiteService.getCommunityHomeSites(community.id);
		const releasesDtoPromise = this.getHomeSiteReleases(community.id);

		return forkJoin(homeSiteDtoPromise, releasesDtoPromise).pipe(map(([hsDto, rDto]) =>
		{
			const homeSites = hsDto.map(dto => new HomeSite(dto)).sort(ReleasesService.homeSiteSorter);
			let homeSiteList = [];
			homeSiteList.push(...homeSites);

			this.homeSites = homeSiteList;

			const releases = rDto.map(dto =>
			{
				return new HomeSiteRelease(dto, homeSites);
			}).sort(ReleasesService.releaseSorter);

			this.releases = releases;
		}));
	}

	refreshHomeSites(communityLbIds: Array<number>)
	{
		this._homeSiteService.getCommunityHomeSitesById(communityLbIds).subscribe(homeSites =>
		{
			if (homeSites.length > 0)
			{
				for (let dto of homeSites)
				{
					let found = this.homeSites.find(hs => hs.commLbid === dto.id);

					if (found)
					{
						found.dto = dto;
					}
					else
					{
						throw new Error(`HomeSite ${dto.id} was returned but not found in local data`);
					}
				}
			}
		});
	}

	private static releaseSorter(left: HomeSiteRelease, right: HomeSiteRelease): number
	{
		const leftDate = left.date, rightDate = right.date;

		if (leftDate.isBefore(rightDate))
		{
			return 1;
		}
		else if (leftDate.isAfter(rightDate))
		{
			return -1;
		}
		else
		{
			return 0;
		}
	}

	private static homeSiteSorter(left: HomeSite, right: HomeSite)
	{
		return left.lotBlock.localeCompare(right.lotBlock);
	}

	/**
	 * Updates any associated homesites
	 * @param dto
	 */
	updateHomeSiteAndReleases(dto: IHomeSiteReleaseDto)
	{
		let release = this.releases.find(r => r.releaseId === dto.releaseId);

		if (release == null)
		{
			release = new HomeSiteRelease(dto, this.homeSites);

			this.releases.push(release);
		}
		else
		{
			release.dto = dto;
		}

		this.releases.sort(ReleasesService.releaseSorter);

		this.refreshHomeSites(dto.homeSitesAssociated);
	}

	homeSiteReleases: Array<IHomeSiteReleaseDto> = [];

	/**
	 * Gets the list of home site releases available for the financial community
	 * @param marketKey
	 * @param communityKey
	 * @param forceRefresh
	 */
	getHomeSiteReleases(financialCommunityId: number, forceRefresh: boolean = false): Observable<Array<IHomeSiteReleaseDto>>
    {
		let url = settings.apiUrl;

		const expand = `release_LotAssoc($select=releaseID, edhLotId), org($select=edhFinancialCommunityId)`;
		const filter = `org/edhFinancialCommunityId eq ${financialCommunityId}`;
		const select = `releaseID, releaseDescription, releaseDate, releaseRank`;

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		url += `releases?${qryStr}`;

		return this._http.get(url).pipe(
			map((response: any) => {
				let retVal = response.value.map(data => {
					return {
						releaseId: data.releaseID,
						releaseDate: data.releaseDate,
						releaseDescription: data.releaseDescription,
						releaseRank: data.releaseRank,
						homeSitesAssociated: data.release_LotAssoc.map(x => x.edhLotId),
						financialCommunityId: financialCommunityId
					} as IHomeSiteReleaseDto;
				});

				return retVal as Array<IHomeSiteReleaseDto>;
			}));
	}

	updateAssociatedHomesites(dto: IHomeSiteReleaseDto)
	{
		let release = this.releases.find(r => r.releaseId === dto.releaseId);

		let index = this.releases.indexOf(release);
		this.releases.splice(index, 1);

		this.refreshHomeSites(dto.homeSitesAssociated);
	}

	saveRelease(release: IHomeSiteReleaseDto): Observable<IHomeSiteReleaseDto>
	{
		let body = {
			releaseData: {
				financialCommunityId: release.financialCommunityId,
				releaseId: release.releaseId == null ? 0 : release.releaseId,
				releaseDate: release.releaseDate,
				releaseDescription: release.releaseDescription,
				releaseRank: release.releaseRank,
				lotAssoc: release.homeSitesAssociated
			}
		};

		let url = settings.apiUrl + `SaveReleases`;

		return this._http.post(url, body).pipe(
			map((response: any) =>
				{
					release.releaseId = response.releaseID;

					return release;
			}),
			catchError(this.handleError));
	}

	deleteRelease(releaseId: number): Observable<any>
	{
		let url = settings.apiUrl + `releases(${releaseId})`;

		return this._http.delete(url).pipe(
			map(response =>
				{
					return response;
			}),
			catchError(this.handleError));
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}//
