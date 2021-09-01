import { Component } from '@angular/core';
import { Router, RoutesRecognized } from '@angular/router';

@Component({
    selector: 'button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.scss']
})
export class ButtonBarComponent 
{
    communityManagementRouterLink = '/community-management/monotony-options';

	constructor(private router: Router)
    {
        if (this.router.url.includes('/community-management'))
        {
            this.communityManagementRouterLink = this.router.url;
        }
        
        this.router.events.subscribe((e: any) =>
        {
            if (e instanceof RoutesRecognized && e.urlAfterRedirects.includes('/community-management'))
            {
                this.communityManagementRouterLink = e.urlAfterRedirects;
            }
        })
    }
}
