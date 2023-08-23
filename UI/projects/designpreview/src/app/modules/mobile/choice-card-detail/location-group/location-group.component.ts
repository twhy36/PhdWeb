import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { DesignToolAttribute, Location, LocationGroup, MyFavorite, MyFavoritesPointDeclined, UnsubscribeOnDestroy } from 'phd-common';
import { ChoiceExt } from '../../../shared/models/choice-ext.model';
import { Store, select } from '@ngrx/store';
import { AdobeService } from '../../../core/services/adobe.service';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import { Observable, combineLatest, of } from 'rxjs';
import { AttributeService } from '../../../core/services/attribute.service';
import { map, switchMap } from 'rxjs/operators';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { ToastrService } from 'ngx-toastr';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import { mergeLocations } from '../../../shared/classes/tree.utils';

@Component({
	selector: 'location-group',
	templateUrl: './location-group.component.html',
	styleUrls: ['./location-group.component.scss']
	})
export class LocationGroupComponent extends UnsubscribeOnDestroy implements OnInit
{
	/////TODO: Since location groups a closely tight to attribute groups, more refactoring is needed to make this component complete with references to attribute groups
	////and tested agaisn attribute groups and location groups with attributes: ref: attribute-group.component.ts

	@Input() currentChoice: ChoiceExt;
	isBlocked: boolean;
	isReadonly: boolean;
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[] = [];
	isDesignComplete: boolean;
	locationGroups: LocationGroup[] = [];
	hasLocations: boolean;
	updatedLocationGroups: LocationGroup[] = [];

	constructor(private attributeService: AttributeService,
    private toastr: ToastrService,
    private store: Store<fromRoot.State>,
    private adobeService: AdobeService)
	{
		super();
	}

	ngOnInit(): void
	{
		const getLocationGroups: Observable<LocationGroup[]> = this.currentChoice?.mappedLocationGroups.length > 0 ? this.attributeService.getLocationGroups(this.currentChoice.mappedLocationGroups.map(x => x.id)) : of([]);

		this.isBlocked = this.currentChoice?.choiceStatus === 'Available' && !this.currentChoice.enabled;

		combineLatest([
			getLocationGroups,
			this.store.pipe(select(state => state.scenario), this.takeUntilDestroyed()),
			this.store.pipe(select(fromFavorite.currentMyFavorite))
		]).pipe(switchMap(([locationGroups, scenario, curFavorite]) =>
		{
			this.isReadonly = scenario.buildMode === BuildMode.BuyerPreview;

			this.myFavoritesPointsDeclined = curFavorite && curFavorite.myFavoritesPointDeclined;

			const locationIds = locationGroups.flatMap(gp => gp.locations.flatMap(loc => loc.id));
			const missingLocations = this.currentChoice.selectedAttributes.filter(x => x.locationId && !locationIds.some(loc => loc === x.locationId));

			// Get missing attributes when the choice is contracted
			const getMissingLocations = this.currentChoice.choiceStatus === 'Contracted' && missingLocations?.length
				? this.attributeService.getLocationCommunities(missingLocations.map(x => x.locationId))
				: of([]);

			// If the choice is not contracted, delete favorited attributes / locations if they
			// are not found in the attribute groups / location groups
			if (this.currentChoice.choiceStatus !== 'Contracted' && missingLocations?.length)
			{
				this.deleteMyFavoritesChoiceAttributes(missingLocations, curFavorite);
			}

			return combineLatest([
				getMissingLocations,
			]).pipe(
				map(([locations]) =>
				{
					mergeLocations(locations, missingLocations, locationGroups);

					return { locationGroups };
				}))
		})).subscribe(data =>
		{
			this.updatedLocationGroups = data.locationGroups;
			this.updateChoiceAttributes();
		},
		error =>
		{
			const msg = 'Failed to load choice attributes!';
			this.toastr.error(msg, 'Error');
			this.adobeService.setErrorEvent(msg + ':' + error.message);
		});

	}

	deleteMyFavoritesChoiceAttributes(missingLocations: DesignToolAttribute[], favorite: MyFavorite)
	{
		const myFavoritesChoice = favorite?.myFavoritesChoice?.find(c => c.divChoiceCatalogId === this.currentChoice.divChoiceCatalogId);

		const choiceLocAttributes = myFavoritesChoice?.myFavoritesChoiceLocations.flatMap(loc => loc.myFavoritesChoiceLocationAttributes);

		const choiceLocations = myFavoritesChoice?.myFavoritesChoiceLocations?.filter(x =>
			!!missingLocations.find(loc => loc.locationGroupId === x.locationGroupCommunityId
        && loc.locationId === x.locationCommunityId));

		if (choiceLocAttributes?.length || choiceLocations?.length)
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesChoiceAttributes(null, missingLocations, myFavoritesChoice));
		}
	}


	updateChoiceAttributes()
	{
		this.hasLocations = this.updatedLocationGroups.length > 0;

		// if the choice has selected attributes then fill in the location/group/attribute names at this time
		if (this.currentChoice.selectedAttributes)
		{
			this.currentChoice.selectedAttributes.forEach(a =>
			{
				var attributeCopy = { ...a };

				if (a.locationGroupId)
				{
					const locationGroup = this.updatedLocationGroups.find(g => g.id === a.locationGroupId);

					if (locationGroup)
					{
						const location = locationGroup.locations.find(loc => loc.id === a.locationId);

						attributeCopy = { ...attributeCopy, locationGroupName: locationGroup.name, locationGroupLabel: locationGroup.label, locationName: location ? location.name : '' };
					}
				}

				return attributeCopy;
			});
		}
	}

	populateLocationGroups(locationGroups: LocationGroup[])
	{
		this.locationGroups = [];

		if (locationGroups)
		{
			locationGroups.forEach(lg =>
			{
				if (this.currentChoice.choiceStatus === 'Contracted' && (this.currentChoice.isPointStructural || this.isDesignComplete))
				{
					// Display selected locations and attributes for a contracted choice when it is structural or design complete
					const selectedLocations: Location[] = [];

					lg.locations.forEach(loc =>
					{
						const selectedAttributes = this.currentChoice.selectedAttributes.filter(x => x.locationGroupId === lg.id && x.locationId === loc.id);

						if (selectedAttributes && selectedAttributes.length)
						{
							selectedLocations.push(loc);
						}
					});

					if (selectedLocations.length)
					{
						const locationGroup = lg;

						locationGroup.locations = selectedLocations;

						this.locationGroups.push(locationGroup);
					}
				}
				else if (!this.isDesignComplete)
				{
					this.locationGroups.push(lg);
				}
			});
		}
	}
}
