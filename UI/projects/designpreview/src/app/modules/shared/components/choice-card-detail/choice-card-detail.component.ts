import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { NgbCarousel } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { of, Observable } from 'rxjs';
import { combineLatest, switchMap, map, withLatestFrom } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, OptionImage, AttributeGroup, Attribute, LocationGroup, Location, DesignToolAttribute,
	DecisionPoint, Group, Tree, MyFavoritesPointDeclined, MyFavorite, ModalRef, ModalService
} from 'phd-common';
import { mergeAttributes, mergeLocations, mergeAttributeImages } from '../../../shared/classes/tree.utils';
import { AttributeService } from '../../../core/services/attribute.service';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';

import { ChoiceExt } from '../../models/choice-ext.model';
import { AttributeLocationComponent } from '../attribute-location/attribute-location.component';
import { AttributeGroupExt, AttributeExt } from '../../models/attribute-ext.model';
import { BlockedByItemObject } from '../../models/blocked-by.model';
import { getDisabledByList } from '../../../shared/classes/tree.utils';
import { AdobeService } from '../../../core/services/adobe.service';
import { TreeService } from '../../../core/services/tree.service';

@Component({
	selector: 'choice-card-detail',
	templateUrl: 'choice-card-detail.component.html',
	styleUrls: ['choice-card-detail.component.scss']
})
export class ChoiceCardDetailComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild('imageCarousel') imageCarousel: NgbCarousel;
	@ViewChildren(AttributeLocationComponent) locationComponents: QueryList<AttributeLocationComponent>;

	@Input() choice: ChoiceExt;
	@Input() path: string;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() myFavoritesPointsDeclined: MyFavoritesPointDeclined[];
	@Input() isReadonly: boolean;
	@Input() isDesignComplete: boolean;
	@Input() groupName: string;
	@Input() subGroupName: string;
	@Input() isPresale: boolean = false;

	@Output() toggleChoice = new EventEmitter<ChoiceExt>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;

	isSelected: boolean = false;
	activeIndex: any = { current: 0, direction: '', prev: 0 };
	imageLoading: boolean = false;
	choiceImages: OptionImage[] = [];
	selectedImageUrl: string;
	hasAttributes: boolean = false;
	attributeGroups: AttributeGroupExt[] = [];
	locationGroups: LocationGroup[] = [];
	choiceDescriptions: string[] = [];
	attributeImageUrl: string;
	currentPoint: DecisionPoint;
	highlightedAttribute: { attributeId: number, attributeGroupId: number, locationId: number, locationGroupId: number };
	choiceAttributeGroups: AttributeGroup[];
	choiceLocationGroups: LocationGroup[];
	blockedChoiceModalRef: ModalRef;
	disabledByList: BlockedByItemObject
		= { pointDisabledByList: null, choiceDisabledByList: null };
	isChoiceImageLoaded: boolean = false;

	constructor(private cd: ChangeDetectorRef,
		private attributeService: AttributeService,
		private toastr: ToastrService,
		public modalService: ModalService,
		private store: Store<fromRoot.State>,
		private adobeService: AdobeService,
		private treeService: TreeService)
	{
		super();
	}

	get disclaimerText() {
		return "Option selections are not final until purchased via a signed agreement or change order.";
	}

	ngOnInit()
	{
		const getAttributeGroups: Observable<AttributeGroup[]> = this.choice.mappedAttributeGroups.length > 0 ? this.attributeService.getAttributeGroups(this.choice) : of([]);
		const getLocationGroups: Observable<LocationGroup[]> = this.choice.mappedLocationGroups.length > 0 ? this.attributeService.getLocationGroups(this.choice.mappedLocationGroups.map(x => x.id)) : of([]);

		getAttributeGroups.pipe(
			combineLatest(getLocationGroups, this.store.pipe(select(fromFavorite.currentMyFavorite))),
			switchMap(([attributeGroups, locationGroups, favorite]) =>
			{
				const attributeIds = _.flatMap(attributeGroups, gp => _.flatMap(gp.attributes, att => att.id));
				const missingAttributes = this.choice.selectedAttributes.filter(x => x.attributeId && !attributeIds.some(att => att === x.attributeId));
				const locationIds = _.flatMap(locationGroups, gp => _.flatMap(gp.locations, loc => loc.id));
				const missingLocations = this.choice.selectedAttributes.filter(x => x.locationId && !locationIds.some(loc => loc === x.locationId));

				// Get missing attributes / locations when the choice is contracted
				const getMissingAttributes = this.choice.choiceStatus === 'Contracted' && missingAttributes?.length
					? this.attributeService.getAttributeCommunities(missingAttributes.map(x => x.attributeId))
					: of([]);
				const getMissingLocations = this.choice.choiceStatus === 'Contracted' && missingLocations?.length
					? this.attributeService.getLocationCommunities(missingLocations.map(x => x.locationId))
					: of([]);

				// If the choice is not contracted, delete favorited attributes / locations if they
				// are not found in the attribute groups / location groups
				if (this.choice.choiceStatus !== 'Contracted' && (missingAttributes?.length || missingLocations?.length))
				{
					this.deleteMyFavoritesChoiceAttributes(missingAttributes, missingLocations, favorite);
				}

				return (getMissingAttributes).pipe(combineLatest(
					getMissingLocations,
					this.attributeService.getAttributeCommunityImageAssoc(attributeIds, this.choice.lockedInChoice ? this.choice.lockedInChoice.choice.outForSignatureDate : null)
				)).pipe(
					map(([attributes, locations, attributeCommunityImageAssocs]) =>
					{
						mergeAttributes(attributes, missingAttributes, attributeGroups);
						mergeLocations(locations, missingLocations, locationGroups);
						mergeAttributeImages(attributeGroups, attributeCommunityImageAssocs);

						return { attributeGroups, locationGroups };
					}));
			})
		).subscribe(data =>
		{
			this.choiceAttributeGroups = data.attributeGroups;
			this.choiceLocationGroups = data.locationGroups;

			this.updateChoiceAttributes();
			this.getImages();
		},
		error =>
		{
			const msg = 'Failed to load choice attributes!';
			this.toastr.error(msg, 'Error');
			this.adobeService.setErrorEvent(msg);
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree)))
		).subscribe(([favorite, tree]) =>
		{
			if (tree)
			{
				const choices = _.flatMap(tree.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) || [];
				const updatedChoice = choices.find(x => x.divChoiceCatalogId === this.choice.divChoiceCatalogId);

				if (updatedChoice)
				{
					this.choice.quantity = updatedChoice.quantity;
					this.choice.selectedAttributes = updatedChoice.selectedAttributes;
					this.choice.myFavoritesChoice = favorite.myFavoritesChoice
						? favorite.myFavoritesChoice.find(x => x.divChoiceCatalogId === this.choice.divChoiceCatalogId)
						: null;
				}
			}

			this.updateChoiceAttributes();
		});

		let desc = this.choice.description ? [this.choice.description] : [];

		this.choiceDescriptions = this.choice.options && this.choice.options.length > 0 ? this.choice.options.filter(o => o.description != null).map(o => o.description) : desc;

		const dps = _.flatMap(this.groups, g => _.flatMap(g.subGroups, sg => sg.points));

		this.currentPoint = dps.find(pt => pt.choices.find(ch => ch.id === this.choice.id));
	}

	deleteMyFavoritesChoiceAttributes(missingAttributes: DesignToolAttribute[], missingLocations: DesignToolAttribute[], favorite: MyFavorite)
	{
		const myFavoritesChoice = favorite?.myFavoritesChoice?.find(c => c.divChoiceCatalogId === this.choice.divChoiceCatalogId);
		const choiceAttributes = myFavoritesChoice?.myFavoritesChoiceAttributes?.filter(x =>
			!!missingAttributes.find(att => att.attributeGroupId === x.attributeGroupCommunityId
				&& att.attributeId === x.attributeCommunityId && !att.locationId));

		let choiceLocAttributes = _.flatMap(myFavoritesChoice?.myFavoritesChoiceLocations, loc => loc.myFavoritesChoiceLocationAttributes);
		choiceLocAttributes = choiceLocAttributes?.filter(x =>
			!!missingAttributes.find(att => att.attributeGroupId === x.attributeGroupCommunityId
				&& att.attributeId === x.attributeCommunityId && !!att.locationId));

		const choiceLocations = myFavoritesChoice?.myFavoritesChoiceLocations?.filter(x =>
			!!missingLocations.find(loc => loc.locationGroupId === x.locationGroupCommunityId
				&& loc.locationId === x.locationCommunityId));

		if (choiceAttributes?.length || choiceLocAttributes?.length || choiceLocations?.length)
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesChoiceAttributes(missingAttributes, missingLocations, myFavoritesChoice));
		}
	}

	updateChoiceAttributes()
	{
		this.populateAttributeGroups(this.choiceAttributeGroups);
		this.populateLocationGroups(this.choiceLocationGroups);
		this.hasAttributes = (this.attributeGroups.length > 0 || this.locationGroups.length > 0);

		// if the choice has selected attributes then fill in the location/group/attribute names at this time
		if (this.choice.selectedAttributes)
		{
			this.choice.selectedAttributes.forEach(a =>
			{
				var attributeCopy = { ...a };

				if (a.locationGroupId)
				{
					const locationGroup = this.locationGroups.find(g => g.id === a.locationGroupId);

					if (locationGroup)
					{
						const location = locationGroup.locations.find(loc => loc.id === a.locationId);

						attributeCopy = { ...attributeCopy, locationGroupName: locationGroup.name, locationGroupLabel: locationGroup.label, locationName: location ? location.name : '' };
					}
				}

				if (a.attributeGroupId)
				{
					const attributeGroup = this.attributeGroups.find(g => g.id === a.attributeGroupId);

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
		this.attributeGroups = [];

		if (attributeGroups)
		{
			const attGroups = _.orderBy(attributeGroups, 'sortOrder');

			attGroups.forEach(attributeGroup =>
			{
				attributeGroup.choiceId = this.choice.id;

				let attributes: AttributeExt[] = [];

				if (attributeGroup.attributes)
				{
					attributeGroup.attributes.forEach(att =>
					{
						let attritbuteStatus = this.choice.choiceStatus;

						if (attritbuteStatus === 'Contracted')
						{
							const selectedAttribute = this.choice.selectedAttributes.find(x => x.attributeId === att.id && x.attributeGroupId === attributeGroup.id);

							if (!selectedAttribute)
							{
								attritbuteStatus = this.choice.isPointStructural ? null : 'ViewOnly';
							}
						}

						// Only display contracted attribute when it is design complete
						if (this.isDesignComplete && attritbuteStatus !== 'Contracted')
						{
							attritbuteStatus = null;
						}

						if (attritbuteStatus)
						{
							const isFavorite = this.choice.favoriteAttributes
								? this.choice.favoriteAttributes.findIndex(x => x.attributeId === att.id && x.attributeGroupId === attributeGroup.id) > -1
								: false;
							attributes.push(new AttributeExt(att, attritbuteStatus, isFavorite));
						}
					});
				}

				if (attributes.length)
				{
					this.attributeGroups.push(new AttributeGroupExt(attributeGroup, attributes));
				}
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
				if (this.choice.choiceStatus === 'Contracted' && (this.choice.isPointStructural || this.isDesignComplete))
				{
					// Display selected locations and attributes for a contracted choice when it is structural or design complete
					let selectedLocations: Location[] = [];

					lg.locations.forEach(loc =>
					{
						const selectedAttributes = this.choice.selectedAttributes.filter(x => x.locationGroupId === lg.id && x.locationId === loc.id);

						if (selectedAttributes && selectedAttributes.length)
						{
							selectedLocations.push(loc);
						}
					});

					if (selectedLocations.length)
					{
						let locationGroup = lg;

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

	getImages()
	{
		if (this.isChoiceImageLoaded)
		{
			return;
		}

		// look for images on the tree option first
		this.choice?.options?.forEach(option =>
		{
			option?.optionImages?.forEach(x =>
			{
				this.choiceImages.push(x);
			});
		});

		// look for choice images if there is no option image
		if (!this.choiceImages.length && this.choice?.hasImage)
		{
			this.choice?.choiceImages?.forEach(x =>
			{
				this.choiceImages.push({ imageURL: x.imageUrl });
			});
		}

		// default image
		if (!this.choiceImages.length)
		{
			return this.treeService.getChoiceImageAssoc([this.choice.id]).subscribe(choiceImages =>
			{
				if (choiceImages && choiceImages.length > 0)
				{
					choiceImages.forEach(i => this.choiceImages.push({ imageURL: i.imageUrl }));
				}
				else
				{
					// We need to triger the cloudinary error so that the elements image is set to
					// noImageAvailable. This will trigger a cloudinary error, but isn't the most
					// elegant. Removing this causes an indinite load or no image to appear.
					this.choiceImages.push({ imageURL: 'this image does not exist' });
				}

				this.selectedImageUrl = this.choiceImages[0].imageURL;

				this.imageLoading = true;
			});
		}
		else
		{
			this.selectedImageUrl = this.choiceImages[0].imageURL;

			this.imageLoading = true;
		}
	}

	get optionDisabled(): boolean
	{
		return this.choice.quantity <= 0 && this.choice.options ? this.choice.options.some(option => !option.isActive) : false;
	}

	onClickBack()
	{
		history.back();
	}

	toggleChoiceClicked()
	{
		if (!this.isReadonly)
		{
			this.toggleChoice.emit(this.choice);
		}
	}

	toggleAttribute(data: { attribute: Attribute, attributeGroup: AttributeGroup, location: Location, locationGroup: LocationGroup, quantity: number })
	{
		this.choice.selectedAttributes = this.getSelectedAttributes(data);

		if (this.choice.selectedAttributes && this.choice.selectedAttributes.length && this.choice.quantity === 0)
		{
			this.choice.quantity = 1;
		}

		this.store.dispatch(
			new ScenarioActions.SelectChoices(this.isDesignComplete,
				{
					choiceId: this.choice.id,
					divChoiceCatalogId: this.choice.divChoiceCatalogId,
					quantity: this.choice.quantity,
					attributes: this.choice.selectedAttributes
				}));
		this.store.dispatch(new ScenarioActions.SetStatusForPointsDeclined(this.myFavoritesPointsDeclined.map(dp => dp.divPointCatalogId), false));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}

	getSelectedAttributes(data: { attribute: Attribute, attributeGroup: AttributeGroup, location: Location, locationGroup: LocationGroup, quantity: number }): DesignToolAttribute[]
	{
		let selectedAttributes: DesignToolAttribute[] = [...this.choice.selectedAttributes];

		const attributeIndex = this.choice.selectedAttributes.findIndex(x =>
			x.attributeId === data.attribute.id &&
			x.attributeGroupId === data.attributeGroup.id &&
			(!data.location || x.locationId === data.location.id) &&
			(!data.locationGroup || x.locationGroupId === data.locationGroup.id));

		if (attributeIndex > -1)
		{
			selectedAttributes.splice(attributeIndex, 1);
		}
		else
		{
			selectedAttributes.push({
				attributeId: data.attribute.id,
				attributeName: data.attribute.name,
				attributeImageUrl: data.attribute.imageUrl,
				attributeGroupId: data.attributeGroup.id,
				attributeGroupName: data.attributeGroup.name,
				attributeGroupLabel: data.attributeGroup.label,
				locationGroupId: data.locationGroup ? data.locationGroup.id : null,
				locationGroupName: data.locationGroup ? data.locationGroup.name : null,
				locationGroupLabel: data.locationGroup ? data.locationGroup.label : null,
				locationId: data.location ? data.location.id : null,
				locationName: data.location ? data.location.name : null,
				locationQuantity: data.quantity,
				scenarioChoiceLocationId: null,
				scenarioChoiceLocationAttributeId: null,
				sku: data.attribute.sku,
				manufacturer: data.attribute.manufacturer
			});
		}

		return selectedAttributes;
	}

	/**
	 * Runs when the carousel moves to a new image
	 * @param event
	 */
	onSlide(event: any)
	{
		this.activeIndex = event;
		this.imageLoading = true;

		if (this.activeIndex)
		{
			this.selectedImageUrl = this.choiceImages[this.activeIndex.current].imageURL;
		}
	}

	/** Removes the loading flag when Cloudinary is able to load an image */
	onLoadImage()
	{
		this.imageLoading = false;

		if (!this.isChoiceImageLoaded)
		{
			this.isChoiceImageLoaded = true;
		}
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		this.imageLoading = false;

		event.srcElement.src = 'assets/NoImageAvailable.png';
	}

	imageClick(image: OptionImage)
	{
		this.highlightedAttribute = null;
		this.attributeImageUrl = null;
		this.selectedImageUrl = image.imageURL;

		const imageIndex = this.choiceImages.findIndex(x => x.imageURL === image.imageURL);

		if (imageIndex > -1)
		{
			this.cd.detectChanges();

			this.imageCarousel.select(imageIndex.toString());
		}
	}

	attributeClick(data: { attribute: Attribute, attributeGroup: AttributeGroup })
	{
		this.locationAttributeClick({
			attribute: data.attribute,
			attributeGroupId: data.attributeGroup.id,
			locationId: 0,
			locationGroupId: 0
		});
	}

	locationAttributeClick(data: { attribute: Attribute, attributeGroupId: number, locationId: number, locationGroupId: number })
	{
		if (this.highlightedAttribute &&
			this.highlightedAttribute.attributeGroupId === data.attributeGroupId &&
			this.highlightedAttribute.attributeId === data.attribute.id &&
			this.highlightedAttribute.locationGroupId === data.locationGroupId &&
			this.highlightedAttribute.locationId === data.locationId)
		{
			this.highlightedAttribute = null;
			this.attributeImageUrl = null;
		}
		else
		{
			this.highlightedAttribute = {
				attributeId: data.attribute.id,
				attributeGroupId: data.attributeGroupId,
				locationId: data.locationId,
				locationGroupId: data.locationGroupId
			};

			const updatedImageUrl = data.attribute.imageUrl || 'assets/attribute-image-not-available.png';

			if (this.attributeImageUrl !== updatedImageUrl)
			{
				this.attributeImageUrl = updatedImageUrl;
				this.imageLoading = true;
			}
		}
	}

	getHighlightedAttributeId(attributeGroup: AttributeGroup): number
	{
		return this.highlightedAttribute && this.highlightedAttribute.attributeGroupId === attributeGroup.id
			? this.highlightedAttribute.attributeId
			: 0;
	}

	getHighlightedLocationAttribute(location: Location, locationGroup: LocationGroup)
	{
		return this.highlightedAttribute
			&& this.highlightedAttribute.locationId === location.id
			&& this.highlightedAttribute.locationGroupId === locationGroup.id
			? { attributeId: this.highlightedAttribute.attributeId, attributeGroupId: this.highlightedAttribute.attributeGroupId }
			: null;
	}

	getTotalQuantiy()
	{
		return this.locationComponents
			.map(loc => loc.locationQuantityTotal ?? 0)
			.reduce((a, b) => a + b, 0);
	}

	getLocationMaxQuantity(locationId: number): number
	{
		if (!this.locationComponents || !this.locationComponents.length)
		{
			return this.choice.maxQuantity;
		}

		const totalQtyAllLocations = this.getTotalQuantiy();

		// default to the location qty
		let locationMaxQty = this.locationComponents.find(lc => lc.attributeLocation.id === locationId)?.locationQuantityTotal ?? 0;

		// if the choice max qty has not been reached then set the max qty for the location to the choice max qty minus the total choice qty plus the location qty
		if (totalQtyAllLocations !== this.choice.maxQuantity)
		{			
			locationMaxQty = this.choice.maxQuantity - totalQtyAllLocations + locationMaxQty;
		}

		return locationMaxQty;
	}

	changeQuantiy(data: { location: Location, locationGroup: LocationGroup, quantity: number, clearAttribute: boolean })
	{
		if (data.clearAttribute)
		{
			this.choice.selectedAttributes = this.choice.selectedAttributes.filter(a => a.locationId !== data.location.id || a.locationGroupId !== data.locationGroup.id);
		}
		else
		{
			let locationAttributes = this.choice.selectedAttributes.filter(a => a.locationId === data.location.id && a.locationGroupId === data.locationGroup.id);

			if (locationAttributes && locationAttributes.length)
			{
				locationAttributes.forEach(att =>
				{
					att.locationQuantity = data.quantity;
				});
			}
			else
			{
				this.choice.selectedAttributes.push({
					attributeId: null,
					attributeName: null,
					attributeImageUrl: null,
					attributeGroupId: null,
					attributeGroupName: null,
					attributeGroupLabel: null,
					locationGroupId: data.locationGroup ? data.locationGroup.id : null,
					locationGroupName: data.locationGroup ? data.locationGroup.name : null,
					locationGroupLabel: data.locationGroup ? data.locationGroup.label : null,
					locationId: data.location ? data.location.id : null,
					locationName: data.location ? data.location.name : null,
					locationQuantity: data.quantity,
					scenarioChoiceLocationId: null,
					scenarioChoiceLocationAttributeId: null,
					sku: null,
					manufacturer: null
				});
			}
		}

		const totalQuantity = this.getTotalQuantiy();

		this.choice.quantity = this.choice.quantity > 0 && totalQuantity === 0 ? 1 : totalQuantity;

		this.store.dispatch(
			new ScenarioActions.SelectChoices(this.isDesignComplete,
				{
					choiceId: this.choice.id,
					divChoiceCatalogId: this.choice.divChoiceCatalogId,
					quantity: this.choice.quantity,
					attributes: this.choice.selectedAttributes
				}));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}

	openBlockedChoiceModal()
	{
		if (!this.disabledByList.choiceDisabledByList && !this.disabledByList.pointDisabledByList)
		{
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.currentPoint, this.choice);
		}
		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { backdrop: true, windowClass: 'phd-blocked-choice-modal' }, true);
	}

	onCloseClicked()
	{
		this.blockedChoiceModalRef?.close();
	}

	onBlockedItemClick()
	{
		this.blockedChoiceModalRef?.close();
	}
}
