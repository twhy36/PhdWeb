import { Component, Input, TemplateRef, EventEmitter, Output, ViewChild, OnInit } from '@angular/core';
import { ActivatedRoute, RouterOutlet, Router } from '@angular/router';

import { Observable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';
import { Constants } from 'phd-common';


@Component({
	selector: 'wizard-template',
	templateUrl: './wizard-template.component.html',
	styleUrls: ['./wizard-template.component.scss']
})
export class WizardTemplateComponent implements OnInit
{
	@Input() disableContinue: boolean;
	@Input() disableCancel: boolean;
	@Input() completeFunc: () => boolean | Observable<boolean>;
	@Input() isDirty: boolean;

	@Output() onCancel: EventEmitter<void> = new EventEmitter<void>();
	@Output() onStepChange = new EventEmitter<{ step: number }>();
	@Output() onError = new EventEmitter<any>();

	@ViewChild(RouterOutlet) outlet: RouterOutlet;

	step: number = 1;
	numSteps: number = 1;
	headerTemplate: TemplateRef<any>;
	buttonTemplate: TemplateRef<any>;
	completed: boolean = false;

	constructor(private route: ActivatedRoute, private router: Router, private modalService: NgbModal) { }

	get showBackBtn(): boolean
	{
		return this.step > 1 && this.step !== this.numSteps;
	}

	get showContinueBtn(): boolean
	{
		return this.step < this.numSteps - 1;
	}

	get showSubmitBtn(): boolean
	{
		return this.step === this.numSteps - 1;
	}

	get showCancelBtn(): boolean
	{
		return this.step !== this.numSteps;
	}

	ngOnInit()
	{
		if (this.route.routeConfig && this.route.routeConfig.children)
		{
			this.numSteps = this.route.routeConfig.children.filter(c => !!c.path).length;
		}
	}

	onRouterOutletActivate(event: any)
	{
		//needs setTimeout because onRouterOutletActivated is fired before child component is initialized
		setTimeout(() =>
		{
			this.headerTemplate = event.headerTemplate;
			this.buttonTemplate = event.buttonTemplate;
			this.step = this.route.routeConfig.children.filter(c => !!c.path).findIndex(ch => ch.path === this.outlet.activatedRoute.snapshot.routeConfig.path) + 1;

			this.onStepChange.emit({ step: this.step });
		}, 0);
	}

	back()
	{
		let stepBack = this.step - 1;

		this.onStepChange.emit({ step: stepBack });

		this.router.navigate([this.route.routeConfig.children.filter(c => !!c.path)[stepBack - 1].path], { relativeTo: this.route });
	}

	cancel()
	{
		if (this.isDirty)
		{
			this.showNavAway();
		}
		else
		{
			this.onCancel.emit();
		}
	}

	close()
	{
		this.onCancel.emit();
	}

	continue()
	{
		if (this.step < this.numSteps)
		{
			this.onStepChange.emit({ step: this.step + 1 });

			this.router.navigate([this.route.routeConfig.children.filter(c => !!c.path)[this.step].path], { relativeTo: this.route });
		}
	}

	complete()
	{
		this.completed = false;

		if (this.completeFunc)
		{
			let result = this.completeFunc();

			if (typeof result === 'boolean')
			{
				this.completed = result;
			}
			else
			{
				result.subscribe(res =>
				{
					this.completed = res

					this.onStepChange.emit({ step: this.step + 1 });

					this.router.navigate([this.route.routeConfig.children.filter(c => !!c.path)[this.step].path], { relativeTo: this.route });
				},
					error =>
					{
						this.onError.emit(error);
					});
			}
		}
		else
		{
			this.completed = true;
		}

		if (this.completed)
		{
			this.onStepChange.emit({ step: this.step + 1 });

			this.router.navigate([this.route.routeConfig.children.filter(c => !!c.path)[this.step].path], { relativeTo: this.route });
		}
	}

	showNavAway()
	{
		let confirm = this.modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = Constants.WARNING;
		confirm.componentInstance.body = Constants.LOSE_CHANGES;
		confirm.componentInstance.defaultOption = Constants.CANCEL;

		confirm.result.then((result) =>
		{
			if (result == Constants.CONTINUE)
			{
				this.onCancel.emit();
			}
		});
	}
}
