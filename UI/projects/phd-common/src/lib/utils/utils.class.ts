import { Choice, ChoiceImageAssoc, OptionImage, Tree } from '../models/tree.model';
import { Buyer } from '../models/buyer.model';
import { ChangeOrderGroup } from '../models/job-change-order.model';

import * as _ from 'lodash';
import { LotChoiceRules } from '../models/rule.model';
import { LotChoiceRuleAssoc } from '../models/lot.model';

export function isChoiceComplete(choice: Choice, isChoiceAttributesRequired: boolean = true): boolean
{
	let isComplete = choice.quantity > 0;

	if (isComplete && isChoiceAttributesRequired)
	{
		isComplete = isChoiceAttributesComplete(choice);
	}

	return isComplete;
}

export function isChoiceAttributesComplete(choice: Choice): boolean
{
	let isComplete = true;

	// if mapped attributes or locations attached to the choice has locations and/or attributes but nothing is selected then the choice isn't complete.
	if ((choice.mappedAttributeGroups?.length > 0 || choice.mappedLocationGroups?.length > 0) && !choice.selectedAttributes.length)
	{
		isComplete = false;
	}
	else
	{
		let locations = choice.mappedLocationGroups ? choice.mappedLocationGroups.map(x => x.id) : [];
		let attributes = choice.mappedAttributeGroups ? choice.mappedAttributeGroups.map(x => x.id) : [];

		isComplete = checkLocationAttributeSelections(choice, locations, attributes);
	}

	return isComplete;
}

function checkLocationAttributeSelections(choice: Choice, locationGroups: number[], attributeGroups: number[])
{
	const selectedAttributes = choice.selectedAttributes;
	const hasLocations = locationGroups && locationGroups.length > 0;
	const hasAttributes = attributeGroups && attributeGroups.length > 0;

	let allAttrSelected = true;

	if (hasLocations)
	{
		locationGroups.forEach(lg =>
		{
			// find all selectedAttributes based on the locationGroup
			let selectedLocations = selectedAttributes.length > 0 ? selectedAttributes.filter(sa => sa.locationGroupId === lg) : [];

			if (selectedLocations.length)
			{
				// get a distinct list of locationId and locationQuantity.
				let distinctLocations = _.uniqBy(selectedLocations.map(l => { return { locationId: l.locationId, locationQuantity: l.locationQuantity }; }), 'locationId');

				if (hasAttributes)
				{
					// for every locationId, make sure it has the same number of attributes selected as the number of attributeGroups
					allAttrSelected = distinctLocations.every(dl => selectedAttributes.filter(sa => sa.locationId === dl.locationId && sa.attributeId != null).length === attributeGroups.length);
				}

				if (allAttrSelected)
				{
					let selectedQty = 0;

					distinctLocations.forEach(l => selectedQty += l.locationQuantity);

					// make sure the selected Quantity matches the choice quantity
					allAttrSelected = choice.quantity === selectedQty;
				}
			}
			else
			{
				allAttrSelected = false;
			}
		});
	}
	else if (hasAttributes)
	{
		let distinctSelectedAttributeIds = selectedAttributes.map(a => a.attributeGroupId).filter((value, index, self) => self.indexOf(value) === index);
		let distinctAttributeIds = attributeGroups.filter((value, index, self) => self.indexOf(value) === index);

		// check attributes to make a value has been selected for each attributeGroup
		allAttrSelected = distinctSelectedAttributeIds.length === distinctAttributeIds.length;
	}

	return allAttrSelected;
}

export function mergeSalesChangeOrderBuyers(salesAgreementBuyers: Array<Buyer>, currentChangeOrder: ChangeOrderGroup): Array<Buyer>
{
	let buyers = _.cloneDeep(salesAgreementBuyers);
	const buyerChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders
		? currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'BuyerChangeOrder')
		: null;

	if (buyerChangeOrder && buyerChangeOrder.jobSalesChangeOrderBuyers)
	{
		const deletedBuyers = buyerChangeOrder.jobSalesChangeOrderBuyers.filter(x => x.action === 'Delete');

		deletedBuyers.forEach(b =>
		{
			const deletedBuyer = buyers.findIndex(x => x.opportunityContactAssoc.id === b.opportunityContactAssoc.id);

			if (deletedBuyer > -1)
			{
				buyers.splice(deletedBuyer, 1);
			}
		});

		const addedBuyers = buyerChangeOrder.jobSalesChangeOrderBuyers.filter(x => x.action === 'Add');

		addedBuyers.forEach(b =>
		{
			let buyer = _.cloneDeep(b);

			if (buyer.opportunityContactAssoc && buyer.opportunityContactAssoc.contact)
			{
				buyer.opportunityContactAssoc.contact.firstName = b.firstName;
				buyer.opportunityContactAssoc.contact.middleName = b.middleName;
				buyer.opportunityContactAssoc.contact.lastName = b.lastName;
				buyer.opportunityContactAssoc.contact.suffix = b.suffix;
			}
			buyers.push(buyer);
		});

		const updatedBuyers = buyerChangeOrder.jobSalesChangeOrderBuyers.filter(x => x.action === 'Change');
		updatedBuyers.forEach(updatedBuyer =>
		{
			let buyer = buyers.find(x => x.opportunityContactAssoc.id === updatedBuyer.opportunityContactAssoc.id);

			if (buyer && buyer.opportunityContactAssoc && buyer.opportunityContactAssoc.contact)
			{
				if (buyer.opportunityContactAssoc.contact)
				{
					buyer.opportunityContactAssoc.contact.firstName = updatedBuyer.firstName;
					buyer.opportunityContactAssoc.contact.middleName = updatedBuyer.middleName;
					buyer.opportunityContactAssoc.contact.lastName = updatedBuyer.lastName;
					buyer.opportunityContactAssoc.contact.suffix = updatedBuyer.suffix;
				}
			}
		});
	}

	return buyers;
}

export function updateLotChoiceRules(lotChoiceRulesAssoc: LotChoiceRuleAssoc[], lotChoiceRules: LotChoiceRules[]): LotChoiceRules[]
{
	if (lotChoiceRulesAssoc?.length)
	{
		lotChoiceRules = [];

		lotChoiceRulesAssoc.forEach(choiceRule =>
		{
			const found = lotChoiceRules
				.findIndex(item => item.divChoiceCatalogId === choiceRule.divChoiceCatalogId);

			if (found > -1)
			{
				lotChoiceRules[found].rules.push({
					edhLotId: choiceRule.edhLotId,
					mustHave: choiceRule.mustHave,
					ruleId: choiceRule.lotChoiceRuleAssocId,
					planId: choiceRule.planId,
				});
			}
			else
			{
				lotChoiceRules.push({
					divChoiceCatalogId: choiceRule.divChoiceCatalogId,
					executed: false,
					rules: [{
						ruleId: choiceRule.lotChoiceRuleAssocId,
						edhLotId: choiceRule.edhLotId,
						mustHave: choiceRule.mustHave,
						planId: choiceRule.planId,
					}],
				});
			}
		});
	}
	return lotChoiceRules;
}

/**
 * Removes a property from an object.
 * @param obj
 * @param propertyName
 */
export function removeProperty(obj, propertyName)
{
	let { [propertyName]: _, ...result } = obj

	return result
}

//update the passing store tree with passing choice images
export function mergeTreeChoiceImages(choiceImages: Array<ChoiceImageAssoc>, tree: Tree)
{
	if (choiceImages && choiceImages.length > 0)
	{
		const choices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) || [];
		// Map image URLs to choiceImages only if no choice options
		choices.map(choice =>
		{
			if (!choice.options || !choice.options.length)
			{
				const imgs = choiceImages.filter(img => img.dpChoiceId === choice.id);

				if (imgs && imgs.length)
				{
					choice.choiceImages = imgs;
				}
			}
		})
	}
}

//get single choice image for a passing Choice
export function getChoiceImage(choice: Choice): string
{
	const options = choice ? choice.options : null;

	if (options?.length) 
	{
		return options.find(x => x.optionImages && x.optionImages.length)?.optionImages[0]?.imageURL;
	}
	else
	{
		return choice?.choiceImages[0]?.imageUrl;
	}
}

//get choice images from option images, or choice images when no mapped options
export function getChoiceImageList(choice: Choice): OptionImage[]
{
	const options = choice ? choice.options : null;
	const images: OptionImage[] = [];

	if (options?.length) 
	{
		options.forEach(option =>
		{
			option?.optionImages?.forEach(x =>
			{
				images.push(x);
			});
		});
	}
	else
	{
		choice?.choiceImages?.forEach(x =>
		{
			images.push({ imageURL: x.imageUrl });
		});
	}

	return images;
}

export function getChoiceIdsHasChoiceImages(tree: Tree, hasAgreement: boolean): Array<Choice>
{
	const choices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) || [];
	const filteredChoices = choices.filter(c => c.hasImage);

	return filteredChoices.map(c =>
	{
		// hasAgreement and lockedInChoice - display contracted choice images only
		const id = hasAgreement && c.lockedInChoice?.choice ? c.lockedInChoice.choice.dpChoiceId : c.id;

		return new Choice({ id: id } as Choice);
	});
}
