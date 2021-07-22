import { Injectable } from '@angular/core';

import { OverlayPanel } from 'primeng/overlaypanel';

/**
 * This is a temporary service to fix an issue with OverlayPanel introduced with v11.
 * Once this behavior is fixed, we can remove this.
 * See: https://github.com/primefaces/primeng/issues/8839
 */
@Injectable()
export class PrimeNGCorrectionService {

	constructor() {
		this.installOverlayPanelFix();
	}

	private installOverlayPanelFix() {
		OverlayPanel.prototype.hide = function (this: OverlayPanel) {
			this.overlayVisible = false;
			this.cd.markForCheck();
			this.render = false;
			this.overlayVisible = false;
		};

		const onAnimationEndSource: Function = OverlayPanel.prototype.onAnimationEnd;
		OverlayPanel.prototype.onAnimationEnd = function (this: OverlayPanel, event: any) {
			onAnimationEndSource.call(this, event);
			if (event.toState === "close") {
				this.render = true;
			}
		};
	}
}
