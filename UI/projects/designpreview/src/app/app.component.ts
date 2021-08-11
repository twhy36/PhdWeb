import { Component } from '@angular/core';

import { environment } from '../environments/environment';
import * as build from './build.json';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
	title = 'Home Designer';

	build = (build as any).default;
	environment = environment;
    
	get branch(): string {
		return build.branch.split('/').slice(2).join('/');
	}
}
