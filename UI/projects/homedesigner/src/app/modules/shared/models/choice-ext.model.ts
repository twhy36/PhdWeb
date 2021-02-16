import { Choice } from 'phd-common'

export class ChoiceExt extends Choice
{
    choiceStatus: 'Available' | 'Contracted' | 'ViewOnly';
    isFavorite: boolean;

	constructor(dto: Choice, status: string, isFavorite: boolean)
	{
        super(dto);
        this.choiceStatus = status as 'Available' | 'Contracted' | 'ViewOnly';
        this.isFavorite = isFavorite;
    }    
}
