import { Attribute, AttributeGroup } from 'phd-common'

export class AttributeExt implements Attribute
{
    id: number;
    imageUrl: string;
    manufacturer: string;
    monotonyConflict: boolean;
    name: string;
    selected?: boolean;
    sku: string;    
    attributeStatus: 'Available' | 'Contracted' | 'ViewOnly';
    isFavorite: boolean;

	constructor(dto: Attribute, status: string, isFavorite: boolean)
	{
        this.id = dto.id;
        this.imageUrl = dto.imageUrl;
        this.manufacturer = dto.manufacturer;
        this.monotonyConflict = dto.monotonyConflict;
        this.name = dto.name;
        this.selected = dto.selected;
        this.sku = dto.sku;    
        this.attributeStatus = status as 'Available' | 'Contracted' | 'ViewOnly';
        this.isFavorite = isFavorite;
    }    
}

export class AttributeGroupExt implements AttributeGroup
{
    attributes: AttributeExt[];
    choiceId: number;
    id: number;
    label: string;
    name: string;
    sortOrder: number;

	constructor(dto: AttributeGroup, attributes: AttributeExt[])
	{
        this.id = dto.id;
        this.choiceId = dto.choiceId;
        this.label = dto.label;
        this.name = dto.name;
        this.sortOrder = dto.sortOrder;
        this.attributes = attributes;
    }        
}
