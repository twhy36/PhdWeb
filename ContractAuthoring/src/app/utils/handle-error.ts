import { throwError, Observable } from "rxjs";

export function handleError(error: Response): Observable<any> {
    // In the future, we may send the server to some remote logging infrastructure //
    console.error(error);

    return throwError(error || 'Server error');
}
