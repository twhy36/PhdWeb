import { Component, Input } from '@angular/core';

@Component({
	selector: 'cl-image',
	template: ''
	})
export class MockCloudinaryImage
{
	@Input() 'public-id': string;
}