import { Component, OnInit } from '@angular/core';
import { IdentityService } from 'phd-common/services';
import { loadScript } from 'phd-common/utils';

import { environment } from '../environments/environment';
import * as build from './build.json';

@Component({
    selector: 'div.app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	user;

	build = (build as any).default;
	environment = environment;

	get branch(): string {
		return build.branch.split('/').slice(2).join('/');
	}

    constructor(private _idService: IdentityService) {
        loadScript(environment.whatFix.scriptUrl).subscribe();
    };

    ngOnInit() {
        this._idService.user.subscribe(user => {
            this.user = user;
        });
    }

}
