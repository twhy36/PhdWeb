import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { IdentityService } from './services/identity.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    loggedIn$: Observable<boolean>;

    constructor(private identityService: IdentityService)
    {
        this.loggedIn$ = this.identityService.loggedIn;
    }
}
