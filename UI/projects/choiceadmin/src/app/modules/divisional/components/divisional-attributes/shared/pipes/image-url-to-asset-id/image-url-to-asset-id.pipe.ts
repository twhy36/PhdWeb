import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'imageUrlToAssetId'
})
export class ImageUrlToAssetIdPipe implements PipeTransform {
	transform(value: string): string {
		// The imageUrl comes in as "picturepark.com/176000/15" - we need to get the 176000 portion
		const lastIdx = value.lastIndexOf('/');
		const secondToLastIdx = value.lastIndexOf('/', lastIdx - 1);

		return value && value.substr(secondToLastIdx + 1, lastIdx - secondToLastIdx - 1);
	}
}
