import { Component, Input } from '@angular/core';
import { DesignToolAttribute } from 'phd-common';
import { ConsolidatedAttributeGroup } from '../../../shared/components/decision-point-summary/decision-point-summary.component';

@Component({
	selector: 'summary-attribute-location-row',
	templateUrl: './summary-attribute-location-row.component.html',
	styleUrls: ['./summary-attribute-location-row.component.scss']
// eslint-disable-next-line indent
})
export class SummaryAttributeLocationRowComponent
{
	@Input() mappedSelectedAttributes;

	consolidatedAttributes(attributes: DesignToolAttribute[]): ConsolidatedAttributeGroup[]
	{
		const attributeGroupLabels: string[] = [];
		attributes.forEach(a =>
		{
			if (a.attributeGroupLabel && !attributeGroupLabels.find(label => a.attributeGroupLabel === label))
			{
				attributeGroupLabels.push(a.attributeGroupLabel); // add all unique attribute group labels to array
			}
		});
  
		const consolidatedAttributeGroups = [];
		attributeGroupLabels.forEach(label =>
		{
			consolidatedAttributeGroups.push(new ConsolidatedAttributeGroup(attributes, label));
		});
    
		return consolidatedAttributeGroups;
	}

}
