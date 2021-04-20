import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable ,  from as fromPromise ,  of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface CanComponentDeactivate {
    canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

function isObservable(f: Observable<boolean> | Promise<boolean>): f is Observable<boolean> {
    return (<any>f).next !== null;
}

@Injectable()
export class CanDeactivateGuard implements CanDeactivate<CanComponentDeactivate> {
    canDeactivate(component: CanComponentDeactivate) {
        let f = component.canDeactivate ? component.canDeactivate() : null;
        if (typeof f === 'boolean') {
            if (f) return true;
        } else {
            if (isObservable(f)) {
                return f.pipe(
                    switchMap(val => {
                        if (val) return of(true);
                    })
                );
            } else {
                return fromPromise(f).pipe(
                    switchMap(val => {
                        if (val) return of(true);
                    })
                );
            }
        }
    }
}
