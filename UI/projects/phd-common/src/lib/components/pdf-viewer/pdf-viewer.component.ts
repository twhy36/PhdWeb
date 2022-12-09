import { Component, OnInit, ViewChild, ElementRef, Input, TemplateRef, Output, EventEmitter } from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

import { interval } from 'rxjs';
import { startWith, skipWhile, take } from 'rxjs/operators';

import { ModalContent } from '../../utils/modal.class';

@Component({
	selector: 'pdf-viewer',
	templateUrl: './pdf-viewer.component.html',
	styleUrls: ['./pdf-viewer.component.scss']
})
export class PDFViewerComponent extends ModalContent implements OnInit
{
	@Input() pdfModalTitle: string = '';
	@Input() pdfQueryString: string;
	@Input() pdfData: any;
	@Input() pdfBaseUrl: string;

	@Output() onAfterPrint = new EventEmitter();
	@Output() onAfterClose = new EventEmitter();

	@ViewChild('iframe', { static: true }) pdfIframe: ElementRef; // available for onInit else without static, it will break.
	@ViewChild('footerTemplate', { static: true }) footerTemplate: TemplateRef<any>;

	safePDFUrl: SafeResourceUrl;

	constructor(public sanitizer: DomSanitizer)
	{
		super();
	}

	ngOnInit()
	{
		// check for passed in query string else default to file=
		this.pdfQueryString = this.pdfQueryString && this.pdfQueryString.length > 0 ? this.pdfQueryString : '?file=';

		// load URL frist
		this.safePDFUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBaseUrl + this.pdfQueryString);

		if (this.pdfData.length)
		{
			this.pdfIframe.nativeElement.onload = () =>
			{
				interval(100).pipe(
					startWith(0),
					skipWhile(() => !this.pdfIframe.nativeElement.contentWindow.PDFViewerApplication.initialized),
					take(1)
				).subscribe(() =>
				{
					this.pdfIframe.nativeElement.contentWindow.PDFViewerApplication.open(this.pdfData)
				});
			};
		}
	}

	closePDFModal()
	{
		this.close();
		this.onAfterClose.emit();
	}

	printPdf()
	{
		this.pdfIframe.nativeElement.contentWindow.PDFViewerApplication.eventBus.on('afterprint', (event) =>
		{
			this.onAfterPrint.emit();
		});

		// use the pdf-viewer print functionality
		this.pdfIframe.nativeElement.contentWindow.PDFViewerApplication.toolbar.buttons.find(a => a.eventName === 'print').element.dispatchEvent(new Event('click'));
	}
}
