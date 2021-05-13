import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ChoiceExt } from '../../../models/choice-ext.model';

@Component({
  selector: 'decision-bar-choice',
  templateUrl: './decision-bar-choice.component.html',
  styleUrls: ['./decision-bar-choice.component.scss']
})
export class DecisionBarChoiceComponent implements OnInit {
	@Input() choice: ChoiceExt;
	@Input() pointIsStructuralItem: boolean;

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();

  constructor() { }

  ngOnInit(): void {
  }

	toggleChoice() {
		this.onToggleChoice.emit(this.choice);
	}

	viewChoiceDetail() {
		this.onViewChoiceDetail.emit(this.choice);
	}

}
