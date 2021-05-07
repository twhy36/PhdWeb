import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute, Router, UrlSegment } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';

import { ReplaySubject, of, Observable } from 'rxjs';
import { combineLatest, switchMap, map, withLatestFrom } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import {
	UnsubscribeOnDestroy, flipOver3, ModalRef, LocationGroup, AttributeGroup, ChangeTypeEnum, ChangeOrderGroup,
	LotExt, Plan, Choice, OptionImage, DecisionPoint, ChoiceImageAssoc
} from 'phd-common';

import { MonotonyConflict } from '../../models/monotony-conflict.model';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';
import { mergeAttributes, mergeLocations, mergeAttributeImages } from '../../../shared/classes/tree.utils';

import { AttributeService } from '../../../core/services/attribute.service';

import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';

import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import * as _ from 'lodash';
import { ModalService } from '../../../core/services/modal.service';
import { selectedPlanData } from '../../../ngrx-store/plan/reducer';
import { TreeService } from '../../../core/services/tree.service';

@Component({
	selector: 'choice-card',
	templateUrl: './choice-card.component.html',
	styleUrls: ['./choice-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceCardComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() currentChoice: Choice;
	@Input() currentDecisionPoint: DecisionPoint;
	@Input() canConfigure: boolean;
	@Input() canOverride: boolean;
	@Input() agreementStatus: string;
	@Input() overrideReason: string;
	@Input() buildMode: 'buyer' | 'spec' | 'model' | 'preview';

	@Output() toggled: EventEmitter<{ choice: Choice, saveNow: boolean, quantity?: number }> = new EventEmitter();
	@Output() saveAttributes = new EventEmitter<void>();
	// When the choice detail modal opens or closes
	@Output() onChoiceModal = new EventEmitter<Choice>();
	@Output() onChoiceChange = new EventEmitter<Choice>();

	@ViewChild('content') content: any;
	@ViewChild('disabledModal') disabledModal: any;

	attributeGroups: AttributeGroup[];
	canEditAgreement: boolean = true;
	changeOrderOverrideReason: string;
	choice: Choice;
	choiceImages: ChoiceImageAssoc[] = [];
	choiceMsg: object[] = [];
	hasAttributes: boolean;
	imageLoading: boolean = false;
	inChangeOrder: boolean = false;
	isPastCutOff: boolean;
	locationGroups: LocationGroup[];
	modalReference: ModalRef;
	disabledModalReference: ModalRef;
	monotonyConflict = new MonotonyConflict();
	optionImages: OptionImage[];
	override$ = new ReplaySubject<boolean>(1);
	unsavedQty: number = 0;
	lots: LotExt;
	plan: Plan;

	constructor(private modalService: ModalService,
		private attributeService: AttributeService,
		private route: ActivatedRoute,
		private router: Router,
		private store: Store<fromRoot.State>,
		@Inject(APP_BASE_HREF) private _baseHref: string,
		private treeService: TreeService
	)
	{
		super();
	}

	get choiceDescription(): string
	{
		let description = '';
		const choice = this.choice;
		const choiceOptions = choice.options;

		if (choice && choice.enabled)
		{
			description = choiceOptions && choiceOptions.length > 0 ? choiceOptions[0].description : choice.description;
		}

		return description;
	}

	get optionDisabled(): boolean
	{
		return !(this.agreementStatus && this.choice.quantity > 0) && this.choice.options ? this.choice.options.some(option => !option.isActive) : false;
	}

	get showDisabledButton(): boolean
	{
		return (this.choice && !this.choice.enabled || this.currentDecisionPoint && !this.currentDecisionPoint.enabled || this.optionDisabled) && !this.choice.lockedInChoice;
	}

	get showConfirmButton(): boolean
	{
		return ((this.choice && this.choice.enabled && this.currentDecisionPoint && this.currentDecisionPoint.enabled && !this.optionDisabled) || this.choice.lockedInChoice) 
		&& (!this.monotonyConflict.monotonyConflict || this.canOverride) 
		&& this.canConfigure;
	}

	ngOnInit()
	{
		this.isPastCutOff = this.currentDecisionPoint && this.currentDecisionPoint.isPastCutOff;
		this.imageLoading = true;

		this.route.paramMap.pipe(
			this.takeUntilDestroyed(),
			map(params =>
			{
				return { choiceId: params.get('choiceId') };
			}))
			.subscribe(x =>
			{
				if (x.choiceId && (x.choiceId === this.choice.id.toString() || x.choiceId === this.choice.divChoiceCatalogId.toString()))
				{
					this.onChoiceDetail(this.choice, this.content);
				}
			});

		const getAttributeGroups: Observable<AttributeGroup[]> = this.choice.mappedAttributeGroups.length > 0 ? this.attributeService.getAttributeGroups(this.choice) : of([]);
		const getLocationGroups: Observable<LocationGroup[]> = this.choice.mappedLocationGroups.length > 0 ? this.attributeService.getLocationGroups(this.choice.mappedLocationGroups.map(x => x.id)) : of([]);

		getAttributeGroups.pipe(
			combineLatest(getLocationGroups),
			switchMap(([attributeGroups, locationGroups]) =>
			{
				const attributeIds = _.flatMap(attributeGroups, gp => _.flatMap(gp.attributes, att => att.id));
				const missingAttributes = this.choice.selectedAttributes.filter(x => x.attributeId && !attributeIds.some(att => att === x.attributeId));
				const locationIds = _.flatMap(locationGroups, gp => _.flatMap(gp.locations, loc => loc.id));
				const missingLocations = this.choice.selectedAttributes.filter(x => x.locationId && !locationIds.some(loc => loc === x.locationId));

				return (missingAttributes && missingAttributes.length
					? this.attributeService.getAttributeCommunities(missingAttributes.map(x => x.attributeId))
					: of([])
				).pipe(combineLatest(missingLocations && missingLocations.length
					? this.attributeService.getLocationCommunities(missingLocations.map(x => x.locationId))
					: of([]),
					this.attributeService.getAttributeCommunityImageAssoc(attributeIds, this.choice.lockedInChoice ? this.choice.lockedInChoice.outForSignatureDate : null))
				).pipe(
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
			this.hasAttributes = (data.attributeGroups.length > 0 || data.locationGroups.length > 0);
			this.attributeGroups = _.orderBy(data.attributeGroups, 'sortOrder');
			this.attributeGroups.forEach(group => group.choiceId = this.choice.id);
			this.locationGroups = data.locationGroups;
			this.imageLoading = false;

			const options = this.choice.options;

			if (options.length)
			{
				let option = options.find(x => x.optionImages && x.optionImages.length > 0);

				if (option)
				{
					this.optionImages = option.optionImages;
				}
			}

			// if the choice has selected attributes then fill in the location/group/attribute names at this time
			if (this.currentChoice.selectedAttributes)
			{
				this.currentChoice.selectedAttributes.forEach(a =>
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
		},
		error =>
		{
			this.imageLoading = false;
		});

		this.override$.next((!!this.choice.overrideNote));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.monotonyChoiceIds),
			combineLatest(
				this.store.pipe(select(fromScenario.choiceOverrides)),
				this.store.pipe(select(selectSelectedLot)),
				this.store.pipe(select(selectedPlanData)),
				this.treeService.getChoiceImageAssoc([this.choice.lockedInChoice ? this.choice.lockedInChoice.dpChoiceId : this.choice.id])
			))
			.subscribe(([monotonyChoices, choiceOverride, lots, plan, choiceImages]) =>
			{
				this.choiceImages = choiceImages;

				let conflictMessage: MonotonyConflict = new MonotonyConflict();

				if (choiceOverride)
				{
					conflictMessage.choiceOverride = (choiceOverride.some(x => x === this.currentChoice.id));
				}

				if (monotonyChoices.ElevationDivChoiceCatalogIds.length && monotonyChoices.ElevationDivChoiceCatalogIds.some(id => id === this.choice.divChoiceCatalogId) && !conflictMessage.choiceOverride)
				{
					conflictMessage.elevationConflict = true;
					conflictMessage.monotonyConflict = true;
				}
				else if (monotonyChoices.ColorSchemeDivChoiceCatalogIds.length && monotonyChoices.ColorSchemeDivChoiceCatalogIds.some(id => id === this.choice.divChoiceCatalogId) && !conflictMessage.choiceOverride)
				{
					conflictMessage.colorSchemeConflict = true;
					conflictMessage.monotonyConflict = true;
				}

				this.monotonyConflict = conflictMessage;

				this.lots = lots;
				this.plan = plan;
				this.setAttributeMonotonyConflict();
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditAgreementOrSpec),
			withLatestFrom(
				this.store.pipe(select(fromScenario.elevationDP)),
				this.store.pipe(select(fromScenario.colorSchemeDP)),
				this.store.pipe(select(fromChangeOrder.changeInput))
			)
		).subscribe(([canEditAgreement, elevationDp, colorSchemeDp, changeInput]) =>
		{
			let canEditInChangeOrder = true;

			if (changeInput && changeInput.type === ChangeTypeEnum.PLAN)
			{
				canEditInChangeOrder = (elevationDp && elevationDp.id === this.choice.treePointId) || (colorSchemeDp && colorSchemeDp.id === this.choice.treePointId);
			}

			this.canEditAgreement = canEditAgreement && canEditInChangeOrder;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromChangeOrder.changeOrderState)
		).subscribe(state =>
		{
			this.inChangeOrder = state.isChangingOrder;

			const changeOrder = state.currentChangeOrder as ChangeOrderGroup;
			this.changeOrderOverrideReason = changeOrder ? changeOrder.overrideNote : null;
		});
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentChoice'])
		{
			this.choice = changes['currentChoice'].currentValue;
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
			else if (!this.canEditAgreement)
			{
				btnLabel = (this.buildMode !== 'spec') ? 'Agreement Locked' : 'Spec Locked';
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

	getDisabledMessage(): string
	{
		switch (this.agreementStatus)
		{
			case 'Out for Signature':
				return 'Disabled Due to Out for Signature';
			default:
				return '';
		}
	}

	toggleSelection()
	{
		if ((this.monotonyConflict.monotonyConflict || this.isPastCutOff) && !this.monotonyConflict.choiceOverride && (!this.currentChoice.quantity || this.isPastCutOff))
		{
			if (this.inChangeOrder && this.changeOrderOverrideReason)
			{
				this.addOverrideReason(this.changeOrderOverrideReason);
			}
			else
			{
				this.onOverride();
			}
		}
		else if (this.canEditAgreement)
		{
			this.choice.overrideNote = null;
			this.override$.next((!!this.choice.overrideNote));
			this.emitToggleEvent();
		}
	}

	addOverrideReason(overrideReason: string)
	{
		this.choice.overrideNote = overrideReason;
		this.override$.next((!!this.choice.overrideNote));
		this.emitToggleEvent();
	}

	emitToggleEvent() 
	{
		let evt = { choice: this.choice, saveNow: false, quantity: this.unsavedQty };

		if (this.choice.maxQuantity > 1 && this.choice.quantity === 0) 
		{
			evt.quantity = this.unsavedQty;
		}

		// resets the value
		this.unsavedQty = this.choice.quantity === 0 ? 1 : 0;

		this.toggled.emit(evt);
	}

	onCallToAction({ choice: choice, quantity: quantity }: { choice: Choice, quantity?: number })
	{
		// Emitting onChoiceChange for when the action is taken from inside choice-card-detail. Sets the view choice in edit-home. 
		this.onChoiceChange.emit(choice);

		this.toggled.emit({ choice: choice, saveNow: true, quantity: quantity });
	}

	onSaveAttributes()
	{
		this.saveAttributes.emit();
	}

	getImagePath(): string
	{
		let imagePath = `${this._baseHref}assets/pultegroup_logo.jpg`;

		if (this.optionImages && this.optionImages.length)
		{
			imagePath = this.optionImages[0].imageURL;
		}
		else if (this.choice && this.choice.hasImage && this.choiceImages.length)
		{
			imagePath = this.choiceImages[0].imageUrl;
		}

		return imagePath;
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}

	onOverride()
	{
		if (!this.overrideReason)
		{
			let body = '';

			if (this.monotonyConflict.monotonyConflict && this.isPastCutOff)
			{
				body = `This will override the Monotony Conflict and the Cut-off`;
			}
			else if (this.monotonyConflict.monotonyConflict)
			{
				body = `This will override the Monotony Conflict`;
			}
			else
			{
				body = `This will override the Cut-off`;
			}

			const confirm = this.modalService.open(ModalOverrideSaveComponent);

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

	onChoiceDetail(choice: Choice, content: any)
	{
		this.modalReference = this.modalService.open(content, { size: 'lg', windowClass: 'phd-choice-details-card' });

		// Since closeModal only runs when we call it after a click, we need to detect if the user closes the detail window
		// the first parameter is if it is closed via .close() method, the second is if it is closed via clicking outside.
		this.modalReference.result.then(() => this.closeDetails(), () => this.closeDetails());
	}

	// Generic closing of any modal opened within the choice card actions
	// Can be either the choice detail card or the 'Disabled' information modal
	closeModal()
	{
		if (this.disabledModalReference)
		{
			this.disabledModalReference.close();
		}
		else
		{
			this.modalReference.close();
		}
	}

	// We sometimes need to remove the choice card ID from the URL...
	// 1. Because it no longer belongs, the specific card detail is not selected...
	// 2. More specifically because it messes up the rest of the "relativeTo" navigation.
	closeDetails()
	{
		const urlSegments: UrlSegment[] = this.route.snapshot.url;
		const finalSegment: string = urlSegments[urlSegments.length - 1].path;

		// Check if choice ID exists at the end of the URL
		if (finalSegment.includes(this.choice.id.toString()))
		{
			// If so, go back up a route so we're back on the decision point URL
			this.router.navigate(['..'], { relativeTo: this.route });
		}

		this.onChoiceChange.emit(null);
	}

	// Opens the 'Disabled' information modal (user clicks on the 'Disabled' link on the card)
	showDisabledMessage()
	{
		this.disabledModalReference = this.modalService.open(this.disabledModal, { windowClass: `phd-ngb-modal` });

		this.disabledModalReference.result.then(() => this.disabledModalReference = null, () => this.disabledModalReference = null);
	}

	// When the user clicks on a link from within the 'disabled' information modal
	// It will include either the Choice object that the user clicked on, or the path to the Decision Point url.
	disabledModalAction(to: { choice: Choice, path: Array<string | number> })
	{
		this.closeModal();

		if (to.choice)
		{
			this.onChoiceModal.emit(to.choice);
		}
		else
		{
			this.router.navigate(to.path);
		}
	}

	setAttributeMonotonyConflict() 
	{
		if (this.lots) 
		{
			let monotonyConflicts = [];
			const selectedAttributes = this.currentChoice.selectedAttributes;

			this.attributeGroups && this.attributeGroups.forEach(attributeGroup => 
			{
				attributeGroup.attributes.forEach(x => 
				{
					x.monotonyConflict = false;
				});

				if (!this.monotonyConflict.choiceOverride) 
				{
					this.lots.monotonyRules && this.lots.monotonyRules.forEach(rule => 
					{
						if (rule.colorSchemeAttributeCommunityIds.length > 0 && rule.edhPlanId === this.plan.id) 
						{
							if (this.attributeGroups.length > 1) 
							{
								selectedAttributes.forEach(x => 
								{
									if (x.attributeGroupId != attributeGroup.id) 
									{
										monotonyConflicts.push(rule.colorSchemeAttributeCommunityIds.some(id => id === x.attributeId))
									}
								});

								if (monotonyConflicts.length > 0) 
								{
									if (monotonyConflicts.some(x => x === false)) 
									{
										monotonyConflicts = [];
									}
									else 
									{
										attributeGroup.attributes.forEach((x => 
										{
											if (x.monotonyConflict === false) 
											{
												if (!selectedAttributes.some(selected => selected.attributeId === x.id)) 
												{
													x.monotonyConflict = (rule.colorSchemeAttributeCommunityIds.some(s => s === x.id))
												}
											}
										}));
									}
								}
							}
							else 
							{
								attributeGroup.attributes.forEach((x => 
								{
									if (x.monotonyConflict === false) 
									{
										if (!selectedAttributes.some(selected => selected.attributeId === x.id)) 
										{
											x.monotonyConflict = (rule.colorSchemeAttributeCommunityIds.some(s => s === x.id))
										}
									}
								}));
							}
						}
					});
				}
			});
		}
	}
}
