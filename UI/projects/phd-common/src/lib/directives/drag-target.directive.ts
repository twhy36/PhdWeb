import { Directive, Input, Output, ElementRef, OnInit, HostListener, EventEmitter, NgZone } from '@angular/core';

@Directive({
    selector: "[dragTarget]"
})
export class DragTargetDirective implements OnInit {
    @Input() scrollElement: string = 'body';

    @Output('handledrop') drop = new EventEmitter<[ElementRef, any[]]>();
    @Output('handledragenter') dragenter = new EventEmitter<[ElementRef, any[]]>();
    @Output('handledragleave') dragleave = new EventEmitter<[ElementRef]>();

    constructor(private el: ElementRef, private ngZone: NgZone) { }

    ngOnInit(): void {
        this.ngZone.runOutsideAngular(() => {
            this.el.nativeElement.addEventListener('dragenter', this.onDragEnter.bind(this));
            this.el.nativeElement.addEventListener('dragover', this.onDragOver.bind(this));
            this.el.nativeElement.addEventListener('dragleave', this.onDragLeave.bind(this));
        })
    }

    enterTarget: any;

    private onDragEnter(event: any): void {
        event.preventDefault();

        this.enterTarget = event.target;

        if (!this.el.nativeElement.classList.contains('drag-active')) {
            return;
        }

        this.el.nativeElement.classList.add('over');

        var children = this.el.nativeElement.children;

        for (var i = 0; i < children.length; i++) {
            children[i].style.pointerEvents = 'none';
        }

        this.dragenter.emit([this.el, []]);
    }

    private onDragOver(event: any): void {
        event.preventDefault();
    }

    private onDragLeave(event: any): void {
        if (this.enterTarget == event.target) {
            this.el.nativeElement.classList.remove('over');
        }

        var children = this.el.nativeElement.children;

        for (var i = 0; i < children.length; i++) {
            children[i].style.pointerEvents = 'auto';
        }

        this.dragleave.emit([this.el]);
    }

    @HostListener('drop', ['$event']) onDrop(event: any): void {
        event.preventDefault();

        if (!this.el.nativeElement.classList.contains('drag-active')) {
            return;
        }

        var elems = document.querySelectorAll(".drag-active");

        for (var i = 0; i < elems.length; i++) {
            elems[i].classList.remove("drag-active");
            elems[i].classList.remove("over");
        }

        var children = this.el.nativeElement.children;

        for (var i = 0; i < children.length; i++) {
            children[i].style.pointerEvents = 'auto';
        }

        //var body = document.querySelector("body");
        var scrollZone = document.querySelector(this.scrollElement);
        var scrollTop = document.querySelector("#scroll-top");
        var scrollBottom = document.querySelector("#scroll-bottom");

        if (scrollTop) {
            scrollZone.removeChild(scrollTop);
        }

        if (scrollBottom) {
            scrollZone.removeChild(scrollBottom);
        }

		var data = <any[]>JSON.parse(event.dataTransfer.getData('text'));

		this.drop.emit([this.el, data]);
    }
}
