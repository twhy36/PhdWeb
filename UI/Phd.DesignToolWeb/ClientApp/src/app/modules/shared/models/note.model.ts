export interface INote
{
	id?: number;
	noteSubCategoryId?: number;
	noteContent?: string;
	//noteAssoc?: NoteAssoc; ???which association
	createdBy?;
	createdUtcDate?;
	lastModifiedUtcDate?;
}

export class Note implements INote
{
	id?: number;
	noteSubCategoryId?: number;
	noteContent?: string;
	noteAssoc?: NoteAssoc;
	createdBy?;
	createdUtcDate?;
	lastModifiedUtcDate?;
	targetAudiences?: Array<TargetAudience>;

	constructor(dto = null)
	{
		if (dto)
		{
			if (dto.id) { this.id = dto.id; }
			if (dto.noteSubCategoryId) { this.noteSubCategoryId = dto.noteSubCategoryId; }
			if (dto.noteContent) { this.noteContent = dto.noteContent; }
			if (dto.noteTargetAudienceAssocs && dto.noteTargetAudienceAssocs.length) { this.targetAudiences = dto.noteTargetAudienceAssocs.map(t => t.targetAudience); }
			if (dto.noteType) { this.noteType = dto.noteType; }
			if (dto.noteAssoc) { this.noteAssoc = dto.noteAssoc; }
			if (dto.createdBy) { this.createdBy = dto.createdBy; }
			if (dto.createdUtcDate) { this.createdUtcDate = dto.createdUtcDate; }
			if (dto.lastModifiedUtcDate) { this.lastModifiedUtcDate = dto.lastModifiedUtcDate; }
		}
	}

	get noteType(): string
	{
		return this.targetAudiences && this.targetAudiences.length ? this.targetAudiences[0].name : '';
	}

	set noteType(type: string)
	{
		const target: TargetAudience = new TargetAudience();

		target.name = type;

		this.targetAudiences = new Array<TargetAudience>(target);
	}

}

export interface INoteTargetAudienceAssoc
{
	noteId: number;
	targetAudienceId: number;
	targetAudience: TargetAudience;
}

export class TargetAudience
{
	id?: number;
	name?: string;
}

// Used to send info to the API when saving
export class NoteAssoc
{
	id: number;
	type: string;
}

export enum TargetAudienceTypeEnum
{
	Internal = "Internal",
	Public = "Public",
	TargetXV = "Target XV",
	Vendor = "Vendor"
}
