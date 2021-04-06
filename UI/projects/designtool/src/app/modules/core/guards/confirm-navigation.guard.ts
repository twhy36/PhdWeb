import { Injectable } from '@angular/core';
import { CanDeactivate, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { Observable ,  of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AlertService } from '../../core/services/alert.service';

export type ConfirmWithCallback = { confirmCallback: (result: boolean) => void, canNavigate: boolean | Observable<boolean> }
export interface ConfirmNavigationComponent {
    allowNavigation: () => boolean | Observable<boolean> | ConfirmWithCallback;
}

@Injectable()
export class ConfirmNavigationGuard implements CanDeactivate<ConfirmNavigationComponent> {

    constructor(private alertService: AlertService) { }

    hasCallback(allowNav: Observable<boolean> | ConfirmWithCallback): allowNav is ConfirmWithCallback {
        return (<ConfirmWithCallback>allowNav).confirmCallback !== undefined;
    }

    canDeactivate(component: ConfirmNavigationComponent,
        currentRoute: ActivatedRouteSnapshot,
        currentState: RouterStateSnapshot,
        nextState?: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {

        if (component.allowNavigation) {
            let val = component.allowNavigation();
            if (typeof val === 'boolean') {
                return !val ? this.alertService.open() : true;
            } else if (this.hasCallback(val)) {
                let valWithCB = val;
                let canNavigate = valWithCB.canNavigate;
                if (typeof canNavigate === 'boolean') {
                    return !canNavigate
                        ? this.alertService.open().pipe(tap(result => valWithCB.confirmCallback(result)))
                        : of(true).pipe(tap(result => valWithCB.confirmCallback(result)))
                } else {
                    return canNavigate.pipe(
                        switchMap(res => {
                            return !res
                                ? this.alertService.open().pipe(tap(result => valWithCB.confirmCallback(result)))
								: of(true).pipe(tap(result => valWithCB.confirmCallback(result)))
                        })
                    );
                }
            } else {
                return val.pipe(
                    switchMap(val => {
                        return !val ? this.alertService.open() : of(true);
                    })
                )
            }
        } else {
            return true;
        }
    }

}
