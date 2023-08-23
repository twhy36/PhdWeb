export class CurrentAttribute
{
	id: number;
	imageUrl: string;
	title: string;

	constructor(
		id: number,
		imageUrl: string, title: string)
	{
		this.id = id;
		this.imageUrl = imageUrl;
		this.title = title;
	}
}