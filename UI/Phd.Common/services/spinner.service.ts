import { Injectable } from '@angular/core';
import { Observable ,  Subject } from 'rxjs';


@Injectable()
export class SpinnerService {
    private spinnerStackCount = 0;
    private spinnerSubject = new Subject<boolean>();

    showSpinner(show: boolean)
    {
        if (show)
        {
            if (this.spinnerStackCount === 0)
            {
                this.spinnerSubject.next(true);
            }
            this.spinnerStackCount++;
        } 
        else 
        {

            if (this.spinnerStackCount === 0)
            {
                this.spinnerSubject.next(false);
            } 
            else
            {
                this.spinnerStackCount--;
                if (this.spinnerStackCount === 0)
                {
                    this.spinnerSubject.next(false);
                }
            }
        }
    }

    get spinnerActive(): Observable<boolean> {
        return this.spinnerSubject;
    }
}