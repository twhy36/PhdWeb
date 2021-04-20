import { OnDestroy, Component } from '@angular/core';
import { Subject, MonoTypeOperatorFunction } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    template: ''
})
export abstract class UnsubscribeOnDestroy implements OnDestroy {
    protected ngUnsubscribe$: Subject<any>;
    protected takeUntilDestroyed<T>(): MonoTypeOperatorFunction<T> {
        return takeUntil(this.ngUnsubscribe$);
    }
    constructor() {
        this.ngUnsubscribe$ = new Subject<void>();
        const f = this.ngOnDestroy;
        this.ngOnDestroy = () => {
            f.apply(this);
            this.ngUnsubscribe$.next();
            this.ngUnsubscribe$.complete();
        };
    }

    // Can't this be removed all together?
    public ngOnDestroy() {
        // no-op
    }
}
