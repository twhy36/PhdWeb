import { Component, Input } from '@angular/core';
import { Group } from 'phd-common';

@Component({ selector: 'group-bar', template: '' })
export class MockGroupBarComponent 
{
	@Input() communityName: string;
	@Input() planName: string;
	@Input() groups: Group[];
	@Input() selectedSubGroupId: number;
}
