import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

import { map } from 'rxjs/operators';

import { IdentityService } from 'phd-common/services';

@Injectable()
export class AccessGuard implements CanActivate {
    constructor(private identityService: IdentityService, private router: Router) {}

    canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) {
        return this.identityService.getClaims().pipe(
            map(claims => {
                if (Object.keys(claims).length === 0) {
                    this.router.navigateByUrl('unauthorized');
                    return false;
                } else {
                    return true;
                }
            })
        );
    }
}
