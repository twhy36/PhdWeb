export class MergeField {
	fieldName: string;
    isActive: boolean;
    
    constructor(dto = null) {
		if (dto) {
			Object.assign(this, dto);
 		}
	}
}
