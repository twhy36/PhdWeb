export class ClickEvent {
	event: string = "Click";
	click: Click = new Click;

	constructor(container: string, element: string, text: string) {
		this.click.container = container;
		this.click.element = element;
		this.click.text = text;
	}
}

export class Click {
	container: string;
	element: string;
	text: string;
}