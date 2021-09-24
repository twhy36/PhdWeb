import { take } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { Router, RoutesRecognized } from '@angular/router';
import { Claims, IdentityService } from 'phd-common';

@Component({
    selector: 'button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.scss']
})
export class ButtonBarComponent implements OnInit
{
    communityManagementRouterLink = '/community-management/monotony-options';

    constructor(private router: Router, private identityService: IdentityService)
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
        });
    }
    
    ngOnInit(): void
    {
        this.identityService.getClaims().pipe(
            take(1)
        ).subscribe(
            (claims: Claims) =>
            {
                if (!claims.SalesAdmin)
                {
                    this.router.navigateByUrl('/community-management/auto-approval');
                }
            }
        );

    }
}
