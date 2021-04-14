import { Component, Input } from '@angular/core';
import { ActionButton } from '../../../../shared/models/action-button.model';

@Component({
    selector: 'divisional-attribute-actions',
    templateUrl: './divisional-attribute-actions.component.html',
    styleUrls: ['./divisional-attribute-actions.component.scss']
})
export class DivisionalAttributeActionsComponent
{
    @Input() buttons: Array<ActionButton>;
	@Input() customClasses: string = '';

	disabled: boolean = false;

	constructor() { }

    onClicked(button: ActionButton) {
        if (button && button.action) {
            button.action(button);
        }
    }
}
