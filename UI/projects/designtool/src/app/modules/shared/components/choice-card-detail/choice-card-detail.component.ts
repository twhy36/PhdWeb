import { Component, Input, OnInit, Output, EventEmitter, ViewChildren, QueryList, AfterViewInit, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';

import 
{
	UnsubscribeOnDestroy, AttributeGroup, DesignToolAttribute, LocationGroup, Choice, ChoiceImageAssoc,
	OptionImage, ModalService, MyFavoritesChoiceAttribute, MyFavoritesChoiceLocation
} from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { AttributeLocationComponent } from '../attribute-location/attribute-location.component';

import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';
import { MonotonyConflict } from '../../models/monotony-conflict.model';
import { AttributeGroupComponent } from '../attribute-group/attribute-group.component';
import { environment } from '../../../../../environments/environment';

@Component({
	selector: 'choice-card-detail',
	templateUrl: './choice-card-detail.component.html',
	styleUrls: ['./choice-card-detail.component.scss']
})
export class ChoiceCardDetailComponent extends UnsubscribeOnDestroy implements OnInit, AfterViewInit, OnChanges
{
	@Input() choice: Choice;
	@Input() locationGroups: LocationGroup[];
	@Input() attributeGroups: AttributeGroup[];
	@Input() monotonyConflict: MonotonyConflict;
	@Input() canEditAgreement: boolean;
	@Input() isPastCutOff: boolean;
	@Input() selectedMax: number;
	@Input() disabledMessage: string;
	@Input() canConfigure: boolean;
	@Input() canOverride: boolean;
	@Input() overrideReason: string;
	@Input() optionDisabled: boolean;
	@Input() isFavorite: boolean;
	@Input() currentChoiceImages: ChoiceImageAssoc[];

	@Output() callToAction = new EventEmitter<{ choice: Choice, quantity?: number }>();
	@Output() saveAttributes = new EventEmitter<void>();
	@Output() close = new EventEmitter<void>();
	@Output() showDisabledMessage = new EventEmitter<void>();

	@ViewChildren(AttributeLocationComponent) locationComponents: QueryList<AttributeLocationComponent>;
	@ViewChild(AttributeGroupComponent) attributeComponent: AttributeGroupComponent;

	hasMonotonyConflict: boolean;
	isButtonEnabled = true;
	activeIndex: any = { current: 0, direction: '', prev: 0 };
	imageLoading: boolean = false;
	qtyAvailable: number;
	selectedQuantity: number;

	choiceImages: ChoiceImageAssoc[] = [];
	optionImages: OptionImage[] = [];
	override$ = new ReplaySubject<boolean>(1);
	choiceDescriptions: string[] = [];

	totalQuantitySelected: number = 0;
	quantityMin: number = 1;
	expandChoiceDescription: boolean = false;

	favoriteChoiceAttributes?: MyFavoritesChoiceAttribute[];
	favoriteChoiceLocations?: MyFavoritesChoiceLocation[];

	get showChoiceDescriptionExpand(): boolean
	{
		// can have multiple sets of descriptions, so if there is a description, two or more of them, or the length is > 100 then display the Show More toggle for Choice Description
		return this.choiceDescriptions.length && (this.choiceDescriptions.length > 1 || this.choiceDescriptions[0].length > 100);
	}

	get hasQuantityLocationsAttributes(): boolean
	{
		// does the choice have quantity? location? location and attribute?
		return this.choice?.maxQuantity > 1 || (this.locationGroups?.length > 0 || (this.locationGroups?.length === 0 && this.attributeGroups?.length > 0));
	}

	get carouselImages(): OptionImage[] | ChoiceImageAssoc[]
	{
		return this.optionImages.length > 0 ? this.optionImages : this.choiceImages;
	}

	constructor(private store: Store<fromRoot.State>,
		private modalService: ModalService)
	{
		super();
	}

	ngOnInit()
	{
		this.hasMonotonyConflict = this.monotonyConflict.monotonyConflict;

		if (this.isFavorite)
		{
			this.store.pipe(
				this.takeUntilDestroyed(),
				select(fromFavorite.myFavoriteChoices)
			).subscribe(favChoices =>
			{
				this.favoriteChoiceAttributes = favChoices?.find(fc => fc.divChoiceCatalogId === this.choice.divChoiceCatalogId)?.myFavoritesChoiceAttributes;
				this.favoriteChoiceLocations = favChoices?.find(fc => fc.divChoiceCatalogId === this.choice.divChoiceCatalogId)?.myFavoritesChoiceLocations;
			});
		}

		const choice = this.choice;
		const quantity = choice.quantity;
		const choiceOptions = choice.options;

		if (choice.enabled)
		{
			let desc = choice.description ? [choice.description] : [];

			this.choiceDescriptions = choiceOptions && choiceOptions.length > 0 ? choiceOptions.filter(o => o.description != null).map(o => o.description) : desc;
		}

		this.selectedMax = quantity > 0 ? quantity : this.selectedMax || 0;

		this.getImages();

		this.override$.next((!!this.choice.overrideNote));
	}

	getImageUrl(image: any)
	{
		// instanceof didn't work, switched to hasOwnProperty.  Issue OptionImage vs ChoiceImageAssoc imageUrl are typed out differently.  TODO: Must change one of them so they match.
		let url = image.hasOwnProperty('imageURL') ? image.imageURL : image.imageUrl;

		return url;
	}

	choiceDescriptionToggle()
	{
		this.expandChoiceDescription = !this.expandChoiceDescription;
	}

	ngAfterViewInit()
	{
		this.totalQuantitySelected = this.getSelectedQuantity();
		this.quantityMin = this.getQuantityMin();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentChoiceImages'])
		{
			this.choiceImages = changes['currentChoiceImages'].currentValue;

			this.getImages();
		}
	}

	getQuantityMin(): number
	{
		let partialQuantitySelected = this.getSelectedQuantity(false);

		return partialQuantitySelected === 0 ? 1 : partialQuantitySelected;
	}

	onShowDisabledMessage()
	{
		this.showDisabledMessage.emit();
	}

	displayButton(): boolean
	{
		if (!this.choice.enabled || !this.canConfigure || this.optionDisabled || this.choice.isRequired || this.choice.disabledByHomesite || this.choice.disabledByReplaceRules?.length || this.choice.disabledByBadSetup || this.choice.disabledByRelocatedMapping?.length)
		{
			return false;
		}

		if (this.isPastCutOff)
		{
			return this.canOverride;
		}

		return !this.hasMonotonyConflict || this.canOverride;
	}

	getImages()
	{
		this.optionImages = [];

		if (this.choice.options)
		{
			this.choice.options.forEach(option =>
			{
				if (option.optionImages)
				{
					// look for images on the tree option first
					option.optionImages.forEach(x =>
					{
						this.optionImages.push(x);
					});
				}
			});
		}

		// default to pultegroup image if no choice/option image is found, or if an option is mapped
		if (!this.choiceImages.length && !this.optionImages.length || (this.choice.options && this.choice.options.length && !this.optionImages.length))
		{
			this.optionImages.push({ imageURL: environment.defaultImageURL });
		}
	}

	getButtonLabel(): string
	{
		let btnLabel = '';

		if (this.choice.quantity > 0)
		{
			btnLabel = this.canEditAgreement && this.canConfigure ? 'Unselect' : 'Selected';
		}
		else
		{
			if (this.isPastCutOff && !this.canOverride)
			{
				btnLabel = 'Past Cut-Off';
			}
			else if (!this.choice.enabled)
			{
				btnLabel = 'Disabled';
			}
			else if (!this.canEditAgreement)
			{
				btnLabel = 'Agreement Locked';
			}
			else
			{
				btnLabel = this.choice.isDecisionDefault ? 'Confirm' : 'Choose';
			}
		}

		return btnLabel;
	}

	get buttonDisabled()
	{
		return (this.isPastCutOff && !this.canOverride) || !this.canEditAgreement || !this.choice.enabled;
	}

	getLocationMaxQuantity(locationId: number): number
	{
		const choiceMaxQty = this.choice.maxQuantity === 1 ? this.choice.maxQuantity : this.selectedMax;

		if (!this.locationComponents)
		{
			return choiceMaxQty;
		}

		const totalQtyAllLocations = this.locationComponents
			.map(loc => loc.locationQuantityTotal)
			.reduce((a, b) => a + b, 0);

		// default to the location qty
		let locationMaxQty = this.locationComponents.find(lc => lc.attributeLocation.id === locationId)?.locationQuantityTotal ?? 0;

		// if the choice max qty has not been reached then set the max qty for the location to the choice max qty minus the total choice qty plus the location qty
		if (totalQtyAllLocations !== choiceMaxQty)
		{
			locationMaxQty = choiceMaxQty - totalQtyAllLocations + locationMaxQty;
		}

		this.totalQuantitySelected = this.getSelectedQuantity();

		return locationMaxQty;
	}

	closeClicked()
	{
		this.close.emit();
	}

	toggleSelection()
	{
		if ((this.hasMonotonyConflict || this.isPastCutOff) && !this.choice.overrideNote && !this.choice.quantity)
		{
			this.onOverride();
		}
		else if (this.canEditAgreement)
		{
			this.addOverrideReason(null);
		}
	}

	addOverrideReason(overrideReason: string)
	{
		if (this.choice.overrideNote)
		{
			this.choice.overrideNote = overrideReason;
		}

		this.override$.next((!!this.choice.overrideNote));

		this.choiceDetailToggled();
	}

	choiceDetailToggled()
	{
		let evt = { choice: this.choice, quantity: null };

		if (this.choice.maxQuantity > 1 && this.choice.quantity === 0)
		{
			evt.quantity = this.selectedMax;
		}

		// resets the value
		this.selectedMax = this.choice.quantity === 0 ? this.selectedMax : 0;

		if (this.choice.quantity > 0)
		{
			// clear out previous selections when deselecting the choice
			if (this.locationComponents && this.locationComponents.length)
			{
				this.locationComponents.forEach(lc => lc.clearSelectedAttributes());
			}
			else if (this.attributeComponent)
			{
				this.attributeComponent.clearSelectedAttributes();
			}
		}
		else if (this.attributeComponent)
		{
			// if just attributes, make sure to get any selections the user might have made before clicking choose
			this.choice.selectedAttributes = this.getSelectedAttributes();
		}

		if (this.choice.maxQuantity > 1)
		{
			this.totalQuantitySelected = this.getSelectedQuantity();
		}

		this.callToAction.emit(evt);
	}

	/**
	 * Updates the attribute selections when there are locations associated with the choice
	 * */
	attributeLocationChanged($event: { overrideNote: string, isOverride: boolean })
	{
		this.totalQuantitySelected = this.getSelectedQuantity();
		this.quantityMin = this.getQuantityMin();

		const selectedAttributes: DesignToolAttribute[] = [];

		this.locationComponents.forEach(l =>
		{
			// location has attributes
			if (l.attributeGroups.length)
			{
				if (l.selectedAttributes && l.selectedAttributes.length && l.locationQuantityTotal)
				{
					l.selectedAttributes.forEach(a =>
					{
						const attributeGroup = this.attributeGroups.find(x => x.id == a.attributeGroupId);
						const attribute = attributeGroup.attributes.find(x => x.id == a.attributeId);

						selectedAttributes.push({
							attributeId: a.attributeId,
							attributeName: a.attributeName,
							attributeImageUrl: attribute.imageUrl,
							attributeGroupId: a.attributeGroupId,
							attributeGroupName: a.attributeGroupName,
							attributeGroupLabel: attributeGroup.label,
							locationGroupId: l.attributeLocationGroup.id,
							locationGroupName: l.attributeLocationGroup.name,
							locationGroupLabel: l.attributeLocationGroup.label,
							locationId: l.attributeLocation.id,
							locationName: l.attributeLocation.name,
							locationQuantity: l.locationQuantityTotal,
							scenarioChoiceLocationId: null,
							scenarioChoiceLocationAttributeId: null,
							sku: a.sku,
							manufacturer: a.manufacturer
						});
					});
				}
				else if (l.locationQuantityTotal)
				{
					selectedAttributes.push({
						attributeId: null,
						attributeName: null,
						attributeImageUrl: null,
						attributeGroupId: null,
						attributeGroupName: null,
						attributeGroupLabel: null,
						locationGroupId: l.attributeLocationGroup.id,
						locationGroupName: l.attributeLocationGroup.name,
						locationGroupLabel: l.attributeLocationGroup.label,
						locationId: l.attributeLocation.id,
						locationName: l.attributeLocation.name,
						locationQuantity: l.locationQuantityTotal,
						scenarioChoiceLocationId: null,
						scenarioChoiceLocationAttributeId: null,
						sku: null,
						manufacturer: null
					});
				}
				else
				{
					l.selectedAttributes = [];
				}
			}
			// location has no attributes
			else
			{
				if (l.locationQuantityTotal)
				{
					selectedAttributes.push({
						attributeId: null,
						attributeName: null,
						attributeImageUrl: null,
						attributeGroupId: null,
						attributeGroupName: null,
						attributeGroupLabel: null,
						locationGroupId: l.attributeLocationGroup.id,
						locationGroupName: l.attributeLocationGroup.name,
						locationGroupLabel: l.attributeLocationGroup.label,
						locationId: l.attributeLocation.id,
						locationName: l.attributeLocation.name,
						locationQuantity: l.locationQuantityTotal,
						scenarioChoiceLocationId: null,
						scenarioChoiceLocationAttributeId: null,
						sku: null,
						manufacturer: null
					});
				}
			}
		});

		// used when maxQuantity is 1 and we have locations involved
		if (this.choice.quantity <= 1 && this.selectedMax === 0 && this.choice.maxQuantity === 1)
		{
			this.selectedMax = 1;
		}

		this.choice.selectedAttributes = selectedAttributes;

		this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.choice.id, overrideNote: $event.overrideNote, quantity: $event.isOverride ? 1 : this.selectedMax, attributes: selectedAttributes }));

		// save change order
		this.saveAttributes.emit();
	}

	/**
	 * Updates the attribute selections when there are no locations associated with the choice
	 * Called from attribute-list component event onAttributeGroupSelected
	 */
	attributeGroupSelected()
	{
		this.choice.selectedAttributes = this.getSelectedAttributes();

		this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.choice.id, overrideNote: null, quantity: this.choice.quantity, attributes: this.choice.selectedAttributes, attributeOnly: true }));

		// only trigger a save if the choice is selected - Change orders only
		if (this.choice.quantity > 0)
		{
			this.saveAttributes.emit();
		}
	}

	getSelectedAttributes(): DesignToolAttribute[]
	{
		const selectedAttributes: DesignToolAttribute[] = [];

		const attributeGroups = this.attributeComponent?.attributeGroups;

		this.attributeComponent.attributeListComponents.forEach(a =>
		{
			//if selectedAttributeId of the attribute list component is not null,
			//add it as one of the list of selected attributes
			if (a.selectedAttributeId != null)
			{
				let attributeGroup = attributeGroups.find(ag => ag.id == a.attributeGroupId);
				let attribute = a.attributes.find(x => x.id == a.selectedAttributeId);

				if (attributeGroup && attribute)
				{
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
			}
		});

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
	}

	/** Removes the loading flag when Cloudinary is able to load an image */
	onLoadImage()
	{
		this.imageLoading = false;
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		this.imageLoading = false;

		event.srcElement.src = environment.defaultImageURL;
	}

	onOverride()
	{
		if (!this.overrideReason)
		{
			let body = 'This will override the ';

			if (this.hasMonotonyConflict && this.isPastCutOff)
			{
				body += `Monotony Conflict and the Cut-off`;
			}
			else if (this.hasMonotonyConflict)
			{
				body += `Monotony Conflict`;
			}
			else
			{
				body += `Cut-off`;
			}

			const confirm = this.modalService.open(ModalOverrideSaveComponent, { backdropClass: 'phd-second-backdrop' });

			confirm.componentInstance.title = 'Warning';
			confirm.componentInstance.body = body;
			confirm.componentInstance.defaultOption = 'Cancel';

			return confirm.result.then((result) =>
			{
				if (result !== 'Close')
				{
					this.store.dispatch(new ScenarioActions.SetOverrideReason(result));

					this.addOverrideReason(result);
				}
			});
		}
		else
		{
			this.addOverrideReason(this.overrideReason);
		}
	}

	private getSelectedQuantity(attrCheck: boolean = true): number
	{
		return this.locationComponents ? this.locationComponents.map(loc => loc.locationQuantityTotal).reduce((a, b) => a + b, 0) : 0;
	}

	changeSelectedQuantity(newQuantity: number)
	{
		this.selectedMax = newQuantity;
		this.choice.quantity = newQuantity;

		if (this.choice.quantity > 0)
		{
			this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.choice.id, overrideNote: null, quantity: this.selectedMax }));
		}
	}
}
