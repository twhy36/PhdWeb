import { Component, OnInit } from '@angular/core';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

@Component({
	  selector: 'nav-bar',
	  templateUrl: 'nav-bar.component.html',
	  styleUrls: ['nav-bar.component.scss']
})

export class NavBarComponent extends UnsubscribeOnDestroy implements OnInit
{
    constructor()
    {
      super();
    }

	  ngOnInit()
	  {
	  }
}
