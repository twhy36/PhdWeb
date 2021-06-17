import { Component, OnInit } from '@angular/core';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import { SpinnerService } from '../../services/spinner.service';
import { UnsubscribeOnDestroy } from '../../utils/unsubscribe-on-destroy';

@Component({
    selector: 'common-spinner',
    templateUrl: './spinner.component.html',
    styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent extends UnsubscribeOnDestroy implements OnInit {
    showSpinner: boolean = false;
    faSpinner = faSpinner;

    constructor(private spinnerService: SpinnerService) { super(); }

    ngOnInit(): void {
        this.spinnerService.spinnerActive.subscribe(val => {
            if (val) this.show();
            else this.hide();
        });
    }

    show(): void {
        this.showSpinner = true;
    }

    hide(): void {
        this.showSpinner = false;
    }
}
