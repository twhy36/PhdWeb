import { Directive, Input, OnChanges, TemplateRef, ViewContainerRef, Inject, forwardRef } from '@angular/core';

import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { IdentityService } from '../services/identity.service';
import { ClaimTypes, Permission } from '../models/claims.model';

@Directive({
    selector: '[requiresClaim]'
})
export class RequiresClaimDirective implements OnChanges {

    @Input() requiresClaim: ClaimTypes;
    @Input('requiresClaimPermission') permission?: Permission;
    @Input('requiresClaimMarket') marketKey?: string;
    @Input('requiresClaimShowIf') showIf: boolean = true;

    private hasView = false;

    constructor(@Inject(forwardRef(() => IdentityService)) private identityService: IdentityService, private template: TemplateRef<any>, private viewContainer: ViewContainerRef) { }

    ngOnChanges() {
        (this.permission
            ? this.identityService.hasClaimWithPermission(this.requiresClaim, this.permission)
            : this.identityService.hasClaim(this.requiresClaim)).pipe(
            switchMap(hasPermission => {
                    if (!hasPermission || this.marketKey === null || this.marketKey === undefined) {
                        return of(hasPermission);
                    } else {
                        return this.identityService.hasMarket(this.marketKey);
                    }
                })
            )
            .subscribe(hasPermission => {
                if (hasPermission === this.showIf && !this.hasView) {
                    this.viewContainer.createEmbeddedView(this.template);
                    this.hasView = true;
                } else if (hasPermission !== this.showIf) {
                    this.viewContainer.clear();
                    this.hasView = false;
                }
            });
    }
}
