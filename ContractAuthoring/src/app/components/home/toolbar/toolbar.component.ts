import { Component, Output, EventEmitter, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-toolbar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
    @Input() showToolBarButtons: boolean = false;
    @Output('backToTemplates') backToTemplates = new EventEmitter();
    @Output('saveToCloud') saveToCloud = new EventEmitter();

    constructor() { }
}
