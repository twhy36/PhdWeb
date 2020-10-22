import { Injectable, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SpinnerService } from '../spinner.service';

@Injectable()
export class SpinnerInterceptor implements HttpInterceptor {
    constructor(private injector: Injector) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (request.headers.has("X-SHOW-SPINNER")) {
            let spinnerService = this.injector.get(SpinnerService);
            spinnerService.showSpinner(true);
            return next.handle(request.clone({ headers: request.headers.delete("X-SHOW-SPINNER") })).pipe(
                finalize(() => {
                    spinnerService.showSpinner(false);
                }));
        }
        else {
            return next.handle(request.clone());
        }
    }
}
