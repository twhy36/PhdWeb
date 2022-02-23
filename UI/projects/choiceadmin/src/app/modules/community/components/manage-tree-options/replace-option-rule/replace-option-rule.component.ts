import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

import { MessageService } from 'primeng/api';
import { bind } from '../../../../shared/classes/decorators.class';
import { ITreeOption } from '../../../../shared/models/option.model';
import { PhdApiDto } from '../../../../shared/models/api-dtos.model';

@Component({
	selector: 'replace-option-rule',
	templateUrl: './replace-option-rule.component.html',
	styleUrls: ['./replace-option-rule.component.scss']
})
export class ReplaceOptionRuleComponent implements OnInit
{
	@Input() option: ITreeOption;
	@Input() options: Array<ITreeOption>;
	@Input() optionRule: PhdApiDto.IOptionChoiceRule;
	@Input() isReadOnly: boolean;

	@Output() save = new EventEmitter<{ option: ITreeOption, callback: Function }>();
	@Output() delete = new EventEmitter<{ rule: PhdApiDto.IOptionReplace, callback: Function }>();

	selectedOption: ITreeOption = null;

	constructor(
		private _msgService: MessageService
	) { }

	ngOnInit(): void
	{
		Object.assign(this.ddlOptions, this.options);

		this.ddlOptions.sort((a, b) => a.id < b.id ? -1 : 1);
	}

	get ddlOptions(): Array<ITreeOption>
	{
		const options: Array<ITreeOption> = [];

		Object.assign(options, this.options.filter(o => !this.optionRule.replaceRules.some(r => r.optionKey === o.id) && o.id !== this.option.id));

		return options.sort((a, b) => a.id < b.id ? -1 : 1);
	}

	getOptionLabel(rule: PhdApiDto.IOptionReplace): string
	{
		const option = this.options.find(o => o.id === rule.optionKey);

		return `${option.id}: ${option.optionHeaderName}`;
	}

	onChangeOption()
	{
		this.saveReplaceOption();
	}

	deleteOptionRuleReplace(rule: PhdApiDto.IOptionReplace)
	{
		this.delete.emit({ rule: rule, callback: this.onDeleteCallback });
	}

	saveReplaceOption()
	{
		this.save.emit({ option: this.selectedOption, callback: this.onSaveCallback });
	}

	@bind
	private onDeleteCallback(rule: PhdApiDto.IOptionReplace)
	{
		// add the option back into the list of options
		const option = this.options.find(o => o.id === rule.optionKey);

		if (option)
		{
			this.ddlOptions.push(option);
		}
	}

	@bind
	private onSaveCallback(option: ITreeOption)
	{
		// remove the option from the list of options
		const index = this.ddlOptions.findIndex(o => o.id === option.id);

		if (index !== -1)
		{
			this.ddlOptions.splice(index, 1);
		}

		this.selectedOption = null;
	}
}
