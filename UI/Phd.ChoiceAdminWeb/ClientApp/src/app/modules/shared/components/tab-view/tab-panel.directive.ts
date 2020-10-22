import { Directive, Input, ContentChild, TemplateRef } from '@angular/core';
import { Observable } from 'rxjs';

@Directive({
    selector: 'phd-tabPanel'
})
export class PhdTabPanelDirective {
    @Input('data') data$: Observable<any>;
    @Input() header: string;

    @ContentChild(TemplateRef) template: TemplateRef<any>;
}
