import { Directive, HostListener, Input } from '@angular/core';
import { PhdTableComponent } from './phd-table.component';

@Directive({
    selector: '[phdRowToggler]'
})
export class RowTogglerDirective {
    @Input('phdRowToggler') data: any;

    constructor(public dt: PhdTableComponent) { }

    @HostListener('click', ['$event']) onClick(event: Event) {
        this.dt.toggleRow(this.data, event);
    }
}
