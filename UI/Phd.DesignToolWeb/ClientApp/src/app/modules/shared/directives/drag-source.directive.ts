import { Directive, Input, Output, ElementRef, DoCheck, HostListener, EventEmitter, NgZone } from '@angular/core';

@Directive({
	selector: '[dragSource]'
})
export class DragSourceDirective implements DoCheck
{
	@Input() dragSource: any;
	@Input() dragEnabled: boolean = true;
	@Input() targetsSelector: string;
	@Input() sourceSelector: string;
	@Input() selectedItems: any[];
	@Input() effect: string = 'move';
	@Input() showPreview = true;
    @Input() enableScroll = true;
    @Input() scrollElement: string = 'body';

    @Output('handledragstart') dragstart = new EventEmitter<[ElementRef, any[]]>();

	constructor(private el: ElementRef, private ngZone: NgZone) { }

	ngDoCheck(): void
    {
		if (!this.sourceSelector)
        {
            if (this.dragEnabled)
            {
                this.el.nativeElement.setAttribute('draggable', true);
            }
            else
            {
                this.el.nativeElement.removeAttribute('draggable');
            }
		}
		else
		{
			var els = this.el.nativeElement.querySelectorAll(this.sourceSelector);

            els.forEach((item: any) =>
            {
                if (this.dragEnabled)
				{
                    item.setAttribute('draggable', true);
                }
                else
                {
                    item.removeAttribute('draggable')
                }
            });
		}
	}

	@HostListener('dragstart', ['$event']) onDragStart(event: any)
	{
		if (!this.dragEnabled)
		{
			return;
		}

		var elems = document.querySelectorAll(this.targetsSelector);

		for (var i = 0; i < elems.length; i++)
		{
			elems[i].classList.add("drag-active");
			elems[i].classList.remove("over");
		}

		event.dataTransfer.effectAllowed = this.effect;

		if (!this.selectedItems)
		{
			event.dataTransfer.setData('text', JSON.stringify([this.dragSource]));
		}
		else
		{
			event.dataTransfer.setData('text', JSON.stringify(this.selectedItems));
		}
		
		if (typeof event.dataTransfer.setDragImage !== "undefined" && !this.showPreview)
		{
            var container = document.createElement("span");

            container.id = "drag-image";

			event.dataTransfer.setDragImage(container, 0, 0);
		}

		if (this.enableScroll)
		{
			this.ngZone.runOutsideAngular(() =>
            {
                setTimeout(() => {
                    var scrollZone = document.querySelector(this.scrollElement);
                    var topScrollZone = document.createElement("div");

                    topScrollZone.id = 'scroll-top';
                    topScrollZone.innerHTML = '<i class="fa fa-chevron-up fa-2x"></i>';
                    topScrollZone.addEventListener('dragover', (evt) =>
                    {
                        scrollZone.scrollBy(0, -10);
                    });

                    scrollZone.appendChild(topScrollZone);

                    var bottomScrollZone = document.createElement('div');

                    bottomScrollZone.id = 'scroll-bottom';
                    bottomScrollZone.innerHTML = '<i class="fa fa-chevron-down fa-2x"></i>';

                    bottomScrollZone.addEventListener('dragover', (evt) =>
                    {
                        scrollZone.scrollBy(0, 10);
                    });

                    scrollZone.appendChild(bottomScrollZone);
                }, 100);
			});
        }

        var data = <any[]>JSON.parse(event.dataTransfer.getData('text'));

        this.dragstart.emit([this.el, data]);
	}

	@HostListener('dragend') onDragEnd(): void
	{
		var elems = document.querySelectorAll(this.targetsSelector);

		for (var i = 0; i < elems.length; i++)
		{
			elems[i].classList.remove("drag-active");
			elems[i].classList.remove("over");
		}

		var scrollZone = document.querySelector(this.scrollElement);
		var scrollTop = document.querySelector("#scroll-top");
		var scrollBottom = document.querySelector("#scroll-bottom");

		if (scrollTop)
		{
			scrollZone.removeChild(scrollTop);
		}

		if (scrollBottom)
		{
			scrollZone.removeChild(scrollBottom);
		}
	}
}
