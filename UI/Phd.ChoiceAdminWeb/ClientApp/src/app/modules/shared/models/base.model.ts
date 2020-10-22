export abstract class BaseNode<TDto>
{
	private _dto: TDto;
	get dto(): TDto
	{
		return this._dto;
	}

	set dto(dto: TDto)
	{
		this._dto = dto;
	}

	matched: boolean = true;
    open: boolean = true;
    sortChanged: boolean = false;

	constructor(dto: TDto)
	{
		if (!dto)
		{
			throw new Error('dto is required');
		}

		this.dto = dto;
	}
}

export abstract class RootNode<TDto, TChildren> extends BaseNode<TDto>
{
	children: Array<TChildren>;
}

export abstract class LeafNode<TDto, TParent> extends BaseNode<TDto>
{
	parent: TParent;
}

export abstract class BranchNode<TDto, TParent, TChildren> extends BaseNode<TDto>
{
	parent: TParent;
	children: Array<TChildren>;
}

export interface INode
{
	parent?: INode;
	children?: Array<INode>;
}

//export interface IBaseDto
//{
//	id: number;
//	label: string;
//	sortOrder: number;
//}
