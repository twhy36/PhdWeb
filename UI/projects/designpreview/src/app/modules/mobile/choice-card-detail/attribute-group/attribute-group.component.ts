import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';

import { Observable, combineLatest, of } from 'rxjs';
import { Store, select } from '@ngrx/store';
import { map, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { ChoiceExt } from '../../../shared/models/choice-ext.model';
import { AttributeGroup, DesignToolAttribute, LocationGroup, MyFavorite, UnsubscribeOnDestroy, Attribute, MyFavoritesPointDeclined } from 'phd-common';

import { AdobeService } from '../../../core/services/adobe.service';
import { AttributeService } from '../../../core/services/attribute.service';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import { mergeAttributeImages, mergeAttributes } from '../../../shared/classes/tree.utils';
import { AttributeExt, AttributeGroupExt } from '../../../shared/models/attribute-ext.model';
import { BuildMode } from '../../../shared/models/build-mode.model';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { CurrentAttribute } from '../../../shared/models/current-attribute.model';

@Component({
	selector: 'attribute-group-mobile',
	templateUrl: './attribute-group.component.html',
	styleUrls: ['./attribute-group.component.scss']
// eslint-disable-next-line indent
})
export class AttributeGroupComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() currentChoice: ChoiceExt;

	isDesignComplete: boolean = false;
	hasAttributes: boolean = false;
	isReadonly: boolean = false;
	imageLoading: boolean = false;
	isBlocked: boolean = false;

	highlightedAttribute: { attributeId: number, attributeGroupId: number, locationId: number, locationGroupId: number };
	highlightedAttributeId: number = 0;
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[] = [];
	choiceAttributeGroups: AttributeGroup[];
	choiceLocationGroups: LocationGroup[];
	updatedAttributeGroups: AttributeGroupExt[] = [];
	defaultImage: string = 'assets/NoImageAvailable.png';
	curAttribute: CurrentAttribute;
	panelStates: boolean[] = [];

	constructor(private attributeService: AttributeService,
		private toastr: ToastrService,
		private store: Store<fromRoot.State>,
		private adobeService: AdobeService,
		private cd: ChangeDetectorRef)
	{
		super();
	}

	ngOnInit()
	{
		const getAttributeGroups: Observable<AttributeGroup[]> = this.currentChoice?.mappedAttributeGroups.length > 0 ? this.attributeService.getAttributeGroups(this.currentChoice) : of([]);

		this.isBlocked = this.currentChoice?.choiceStatus === 'Available' && !this.currentChoice.enabled;

		combineLatest([
			getAttributeGroups,
			this.store.pipe(select(state => state.scenario), this.takeUntilDestroyed()),
			this.store.pipe(select(fromFavorite.currentMyFavorite))
		]).pipe(switchMap(([attributeGroups, scenario, curFavorite]) =>
		{
			this.isReadonly = scenario.buildMode === BuildMode.BuyerPreview;

			this.myFavoritesPointsDeclined = curFavorite && curFavorite.myFavoritesPointDeclined;

			const attributeIds = attributeGroups.flatMap(gp => gp.attributes.flatMap(att => att.id));
			const missingAttributes = this.currentChoice.selectedAttributes.filter(x => x.attributeId && !attributeIds.some(att => att === x.attributeId));

			// Get missing attributes / locations when the choice is contracted
			const getMissingAttributes = this.currentChoice.choiceStatus === 'Contracted' && missingAttributes?.length
				? this.attributeService.getAttributeCommunities(missingAttributes.map(x => x.attributeId))
				: of([]);

			// If the choice is not contracted, delete favorited attributes / locations if they
			// are not found in the attribute groups / location groups
			if (this.currentChoice.choiceStatus !== 'Contracted' && missingAttributes?.length)
			{
				this.deleteMyFavoritesChoiceAttributes(missingAttributes, curFavorite);
			}

			return combineLatest([
				getMissingAttributes,
				this.attributeService.getAttributeCommunityImageAssoc(attributeIds, this.currentChoice.lockedInChoice ? this.currentChoice.lockedInChoice.choice.outForSignatureDate : null)
			]).pipe(
				map(([attributes, attributeCommunityImageAssocs]) =>
				{
					mergeAttributes(attributes, missingAttributes, attributeGroups);
					mergeAttributeImages(attributeGroups, attributeCommunityImageAssocs);

					return { attributeGroups };
				}))
		})).subscribe(data =>
		{
			this.choiceAttributeGroups = data.attributeGroups;
			this.updateChoiceAttributes();
		},
		error =>
		{
			const msg = 'Failed to load choice attributes!';
			this.toastr.error(msg, 'Error');
			this.adobeService.setErrorEvent(msg + ':' + error.message);
		});

		//get selected attribute
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.getCurrentAttribute)
		).subscribe(att =>
		{
			this.curAttribute = att;
		});
	}

	deleteMyFavoritesChoiceAttributes(missingAttributes: DesignToolAttribute[], favorite: MyFavorite)
	{
		const myFavoritesChoice = favorite?.myFavoritesChoice?.find(c => c.divChoiceCatalogId === this.currentChoice.divChoiceCatalogId);
		const choiceAttributes = myFavoritesChoice?.myFavoritesChoiceAttributes?.filter(x =>
			!!missingAttributes.find(att => att.attributeGroupId === x.attributeGroupCommunityId
				&& att.attributeId === x.attributeCommunityId && !att.locationId));

		let choiceLocAttributes = myFavoritesChoice?.myFavoritesChoiceLocations.flatMap(loc => loc.myFavoritesChoiceLocationAttributes);
		choiceLocAttributes = choiceLocAttributes?.filter(x =>
			!!missingAttributes.find(att => att.attributeGroupId === x.attributeGroupCommunityId
				&& att.attributeId === x.attributeCommunityId && !!att.locationId));

		if (choiceAttributes?.length || choiceLocAttributes?.length)
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesChoiceAttributes(missingAttributes, null, myFavoritesChoice));
		}
	}

	updateChoiceAttributes()
	{
		this.populateAttributeGroups(this.choiceAttributeGroups);
		this.hasAttributes = this.updatedAttributeGroups.length > 0;

		// if the choice has selected attributes then fill in the location/group/attribute names at this time
		if (this.currentChoice.selectedAttributes)
		{
			this.currentChoice.selectedAttributes.forEach(a =>
			{
				var attributeCopy = { ...a };

				if (a.attributeGroupId)
				{
					const attributeGroup = this.updatedAttributeGroups.find(g => g.id === a.attributeGroupId);

					if (attributeGroup)
					{
						const attribute = attributeGroup.attributes.find(attr => attr.id === a.attributeId);

						attributeCopy = { ...attributeCopy, attributeGroupName: attributeGroup.name, attributeGroupLabel: attributeGroup.label };

						if (attribute)
						{
							attributeCopy = { ...attributeCopy, attributeName: attribute.name, attributeImageUrl: attribute.imageUrl, sku: attribute.sku, manufacturer: attribute.manufacturer };
						}
					}
				}
				return attributeCopy;
			});
		}
	}

	populateAttributeGroups(attributeGroups: AttributeGroup[])
	{
		this.updatedAttributeGroups = [];

		if (attributeGroups)
		{
			const attGroups = attributeGroups.slice().sort((a, b) => a.sortOrder - b.sortOrder);

			attGroups.forEach(attributeGroup =>
			{
				attributeGroup.choiceId = this.currentChoice.id;

				const attributes: AttributeExt[] = [];

				if (attributeGroup.attributes)
				{
					attributeGroup.attributes.forEach(att =>
					{
						let attritbuteStatus = this.currentChoice.choiceStatus;

						if (attritbuteStatus === 'Contracted')
						{
							const selectedAttribute = this.currentChoice.selectedAttributes.find(x => x.attributeId === att.id && x.attributeGroupId === attributeGroup.id);

							if (!selectedAttribute)
							{
								attritbuteStatus = this.currentChoice.isPointStructural ? null : 'ViewOnly';
							}
						}

						// Only display contracted attribute when it is design complete
						if (this.isDesignComplete && attritbuteStatus !== 'Contracted')
						{
							attritbuteStatus = null;
						}

						if (attritbuteStatus)
						{
							const isFavorite = this.currentChoice?.quantity && this.currentChoice?.favoriteAttributes
								? this.currentChoice?.favoriteAttributes.findIndex(x => x.attributeId === att.id && x.attributeGroupId === attributeGroup.id) > -1
								: false;
							attributes.push(new AttributeExt(att, attritbuteStatus, isFavorite));
						}
					});
				}

				if (attributes.length)
				{
					this.updatedAttributeGroups.push(new AttributeGroupExt(attributeGroup, attributes));
					this.panelStates.push(true);
				}
			});
		}
	}

	get optionDisabled(): boolean
	{
		return this.currentChoice?.quantity <= 0 && this.currentChoice?.options ? this.currentChoice?.options.some(option => !option.isActive) : false;
	}

	togglePanelState(index: number, expanded: boolean)
	{
		this.panelStates[index] = expanded;
	}

	//triggered when attriute thumbnail is clicked
	handleAttributeClick(event: MouseEvent, attribute: Attribute)
	{
		//to stay in place when event
		event.preventDefault();

		const updatedImageUrl = attribute.imageUrl || this.defaultImage;
		this.store.dispatch(new ScenarioActions.CurrentAttribute(new CurrentAttribute(attribute.id, updatedImageUrl, attribute.name)));
		this.cd.detectChanges();
	}

	//triggered when attriute heart is clicked (favorited)
	handleToggleAttributeFavorite(event: MouseEvent, attribute: AttributeExt, attributeGroup: AttributeGroupExt) 
	{
		this.handleAttributeClick(event, attribute);

		if (!this.isReadonly)
		{
			this.currentChoice.selectedAttributes = this.getSelectedAttributes(attribute, attributeGroup);

			if (this.currentChoice.selectedAttributes && this.currentChoice.selectedAttributes.length && this.currentChoice?.quantity === 0)
			{
				this.currentChoice.quantity = 1;
			}

			this.store.dispatch(
				new ScenarioActions.SelectChoices(this.isDesignComplete,
					{
						choiceId: this.currentChoice.id,
						divChoiceCatalogId: this.currentChoice.divChoiceCatalogId,
						quantity: this.currentChoice.quantity,
						attributes: this.currentChoice.selectedAttributes
					}));
			this.store.dispatch(new ScenarioActions.SetStatusForPointsDeclined(this.myFavoritesPointsDeclined.map(dp => dp.divPointCatalogId), false));
			this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());

			const groupIdx = this.updatedAttributeGroups.findIndex(group => group.id === attributeGroup.id);
			this.updatedAttributeGroups[groupIdx] = attributeGroup;
		}
	}

	getSelectedAttributeNames(attributeGroup: AttributeGroupExt): string
	{
		let attributeNames = '';

		const favoriteAttributes = attributeGroup.attributes && attributeGroup.attributes.length
			? attributeGroup.attributes.filter(x => x.isFavorite)
			: [];

		if (favoriteAttributes && favoriteAttributes.length)
		{
			attributeNames = favoriteAttributes.map(a => a.name).reduce((list, name) => list + ', ' + name);

		}
		return attributeNames;
	}

	getSelectedAttributes(attribute: AttributeExt, attributeGroup: AttributeGroupExt): DesignToolAttribute[]
	{
		const selectedAttributes: DesignToolAttribute[] = [...this.currentChoice.selectedAttributes];

		const attributeIndex = this.currentChoice.selectedAttributes.findIndex(x =>
			x.attributeId === attribute.id && x.attributeGroupId === attributeGroup.id);

		if (attributeIndex > -1)
		{
			selectedAttributes.splice(attributeIndex, 1);
			attribute.isFavorite = false;
		}
		else
		{
			attribute.isFavorite = true;
			selectedAttributes.push({
				attributeId: attribute.id,
				attributeName: attribute.name,
				attributeImageUrl: attribute.imageUrl,
				attributeGroupId: attributeGroup.id,
				attributeGroupName: attributeGroup.name,
				attributeGroupLabel: attributeGroup.label,
				locationGroupId: null,
				locationGroupName: null,
				locationGroupLabel: null,
				locationId: null,
				locationName: null,
				locationQuantity: null,
				scenarioChoiceLocationId: null,
				scenarioChoiceLocationAttributeId: null,
				sku: attribute.sku,
				manufacturer: attribute.manufacturer
			});
		}

		return selectedAttributes;
	}
}
