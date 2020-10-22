import { Component, Input, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { MergeField } from '../../../../models/merge-field.model';

@Component({
    selector: 'app-accordion-item',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './accordion-item.component.html',
    styleUrls: ['./accordion-item.component.scss']
})
export class AccordionItemComponent {
    @Input() title: string;
    @Input() mergeFields: Observable<Array<MergeField>>;
    @Output("mergeFieldClicked") click: EventEmitter<MergeField> = new EventEmitter();

    constructor() { }
}
