import { Component, Input } from '@angular/core';

import * as _ from 'lodash';

import { ModalContent } from 'phd-common';

@Component({
	selector: 'idle-logout',
	templateUrl: './idle-logout.component.html',
	styleUrls: ['./idle-logout.component.scss']
	})

export class IdleLogoutComponent extends ModalContent
{
	@Input() countdown: number;

	constructor()
	{
		super();
	}
}

