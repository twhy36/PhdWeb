import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { NgbCarousel } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { of, Observable } from 'rxjs';
import { combineLatest, switchMap, map } from 'rxjs/operators';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, OptionImage, AttributeGroup, LocationGroup } from 'phd-common';
import { mergeAttributes, mergeLocations, mergeAttributeImages } from '../../../shared/classes/tree.utils';
import { AttributeService } from '../../../core/services/attribute.service';

import { ChoiceExt } from '../../models/choice-ext.model';

@Component({
	selector: 'choice-card-detail',
	templateUrl: 'choice-card-detail.component.html',
	styleUrls: ['choice-card-detail.component.scss']
})
export class ChoiceCardDetailComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild('imageCarousel') imageCarousel: NgbCarousel;

	@Input() choice: ChoiceExt;
	@Input() path: string;

	@Output() onBack = new EventEmitter();
	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();

	isSelected : boolean = false;
	activeIndex: any = { current: 0, direction: '', prev: 0 };
	imageLoading: boolean = false;
	choiceImages: OptionImage[] = [];
	selectedImageUrl: string;
	hasAttributes: boolean = false;
	attributeGroups: AttributeGroup[];
	locationGroups: LocationGroup[];

	constructor(private attributeService: AttributeService, private toastr: ToastrService)
    {
		super();
	}

	ngOnInit() {
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

			this.getImages();
			this.scrollToTop();
		},
		error =>
		{
			this.toastr.error('Failed to load choice attributes!', 'Error');
		});	

	}

	getImages()
	{
		// get image from choice if there is one, else default to pulte logo
		let image = this.choice.imagePath.length > 0 ? this.choice.imagePath : 'assets/pultegroup_logo.jpg';

		if (this.choice.options)
		{
			this.choice.options.forEach(option =>
			{
				if (option.optionImages)
				{
					// look for images on the tree option first
					option.optionImages.forEach(x =>
					{
						this.choiceImages.push(x);
					});
				}
			});
		}

		// default to choice image if no option imges found
		if (!this.choiceImages.length)
		{
			this.choiceImages.push({ imageURL: image });
		}

		this.selectedImageUrl = this.choiceImages[0].imageURL;	
		this.imageLoading = true;
	}

	scrollToTop() {
		setTimeout(() =>
		{
			const choiceLabel = document.getElementById('choiceLabel');
			if (choiceLabel)
			{
				choiceLabel.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
			}
		}, 150);
	}

	onClickBack()
	{
		this.onBack.emit();
	}

	toggleChoice() 
	{
		this.onToggleChoice.emit(this.choice);
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
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		this.imageLoading = false;

		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}	

	imageClick(image: OptionImage)
	{
		this.selectedImageUrl = image.imageURL;

		const imageIndex = this.choiceImages.findIndex(x => x.imageURL === image.imageURL);
		if (imageIndex > -1)
		{
			this.imageCarousel.select(imageIndex.toString());	
		}
	}
}
