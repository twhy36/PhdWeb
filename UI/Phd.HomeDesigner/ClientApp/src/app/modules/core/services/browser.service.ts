import { Injectable, NgZone } from '@angular/core';

import { BehaviorSubject ,  Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable()
export class BrowserService {
	private isTablet$: BehaviorSubject<boolean>;
	private clientWidth$: BehaviorSubject<number>;
	private timeout: null;
	private maxTabletWidth: number = 1024;

	constructor(private zone: NgZone) {
		this.isTablet$ = new BehaviorSubject<boolean>(window.innerWidth <= this.maxTabletWidth);
		this.clientWidth$ = new BehaviorSubject<number>(window.innerWidth);
		this.zone.runOutsideAngular(() => {
			window.addEventListener("resize", function (evt) {
				if (!this.timeout) {
					this.timeout = setTimeout(function () {
						this.timeout = null;
						this.zone.run(() => {
							let clientWidth: number;
							
							  if (document.documentElement && document.documentElement.clientWidth) {
								clientWidth = document.documentElement.clientWidth;
							  }
							  else if (document.body) {
								clientWidth = document.body.clientWidth;
							  }

							if (clientWidth <= this.maxTabletWidth) {
								this.isTablet$.next(true);
							} else {
								this.isTablet$.next(false);
							}

							this.clientWidth$.next(clientWidth);
						});
					}.bind(this), 200);
				}
			}.bind(this));
		});
	}

	public isTablet(): Observable<boolean> {
		return this.isTablet$.pipe(
			distinctUntilChanged()
		);
	}

	public clientWidth(): Observable<number> {
		return this.clientWidth$.pipe(
			distinctUntilChanged()
		);
	}
}
