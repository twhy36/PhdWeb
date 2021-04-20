import { Injectable, Inject, forwardRef } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { Observable } from 'rxjs';

import { IdentityService } from '../services/identity.service';
import { ClaimTypes } from '../models/claims.model';

@Injectable()
export class ClaimGuard implements CanActivate {
    constructor(@Inject(forwardRef(() => IdentityService)) private identityService: IdentityService) { }

    canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        const claim = next.data['requiresClaim'] as ClaimTypes;

        return this.identityService.hasClaim(claim);
    }
}
