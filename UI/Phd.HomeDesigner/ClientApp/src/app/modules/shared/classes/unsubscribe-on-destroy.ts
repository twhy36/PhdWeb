import { OnDestroy } from '@angular/core';
import { Subject ,  MonoTypeOperatorFunction } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export abstract class UnsubscribeOnDestroy implements OnDestroy {
	  protected ngUnsubscribe$: Subject<any>;
	  protected takeUntilDestroyed<T>(): MonoTypeOperatorFunction<T> {
		    return takeUntil(this.ngUnsubscribe$);
	  }
	  constructor() {
		    this.ngUnsubscribe$ = new Subject<void>();
	  }

	  public ngOnDestroy() {
		    this.ngUnsubscribe$.next();
		    this.ngUnsubscribe$.complete();
	  }
} 
