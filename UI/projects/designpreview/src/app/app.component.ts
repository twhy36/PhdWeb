import { Component } from '@angular/core';
import { Idle, DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { environment } from '../environments/environment';
import * as build from './build.json';

import { ModalService, ModalRef, IdentityService } from 'phd-common';
import { IdleLogoutComponent } from './modules/core/components/idle-logout/idle-logout.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
	title = 'Design Preview';

	build = (build as any).default;
	environment = environment;

	logoutModal: ModalRef;

	get branch(): string {
		return build.branch.split('/').slice(2).join('/');
	}

	constructor(
		private idle: Idle, 
		private modalService: ModalService, 
		private identityService: IdentityService) 
	{
		// Start idle watch for user inactivities if an external user is logged in
		if (sessionStorage.getItem('authProvider') === 'sitecoreSSO')
		{
			this.watchIdle();			
		}
	}

	watchIdle()
	{
		// sets an idle timeout of 14 minutes (840 seconds)
		this.idle.setIdle(840);
		// sets a timeout period of 60 seconds. after 900 seconds of inactivity, the user will be considered timed out.
		this.idle.setTimeout(60);
		// sets the default interrupts, in this case, things like clicks, scrolls, touches to the document
		this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);
	
		this.idle.onTimeout.subscribe(() => {
			this.logout();
		});

		this.idle.onIdleStart.subscribe(() => {
			this.idle.clearInterrupts();

			let ngbModalOptions: NgbModalOptions = {
				centered: true,
				backdrop: 'static',
				keyboard: false
			};
	
			this.logoutModal = this.modalService.open(IdleLogoutComponent, ngbModalOptions);

			this.logoutModal.result.then((result) =>
			{
				if (result == 'Logout')
				{
					this.logout();
				}
				else
				{
					// stay signed in
					this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);
					this.idle.watch();
				}

			}, (reason) => { });			
		});

		this.idle.onTimeoutWarning.subscribe((countdown) => {
			this.logoutModal.componentInstance.countdown = countdown;
		});
	
		this.idle.watch();
	}
	
	logout()
	{
		this.idle.stop();
		this.logoutModal.dismiss();
		this.identityService.logout();
	}
}
