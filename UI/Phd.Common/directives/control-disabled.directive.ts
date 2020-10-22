import { Directive, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
	selector: '[controlDisabled]'
})
export class ControlDisabledDirective
{
    @Input() controlDisabled : boolean = false;

    constructor(private ngControl: NgControl) { }

    ngOnChanges(changes) {
        if (changes['controlDisabled']) {
            const action = this.controlDisabled ? 'disable' : 'enable';

            this.ngControl.control[action]();
        }
    }
}