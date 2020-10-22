import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export function withSpinner(http: HttpClient): HttpClient {
    //check for mocked http - if it's mocked, just pass through the mocked instance
    if (http.request === undefined) {
        return http;
    }

    type Options = {
        headers?: HttpHeaders | {
            [header: string]: string | string[];
        };
        observe?: 'body';
        params?: HttpParams | {
            [param: string]: string | string[];
        };
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    };

    let getOptions = (options?: Options) => {
        if (options) {
            if (options.headers && (<HttpHeaders>options.headers).set !== undefined) {
                options.headers = (<HttpHeaders>options.headers).set("X-SHOW-SPINNER", "");
            } else if (options.headers) {
                (<{ [header: string]: string | string[] }>options.headers)["X-SHOW-SPINNER"] = "";
            } else {
                options.headers = { "X-SHOW-SPINNER": "" };
            }
            return options;
        } else {
            return {
                headers: { "X-SHOW-SPINNER": "" }
            }
        }
    };

    return <any>{
        get: (url: string, options?: Options) => {
            let newOptions = getOptions(options);
            return <Observable<Object>>HttpClient.prototype.get.apply(http, [url, newOptions]);
        },

        put: (url: string, body: any, options?: Options) => {
            let newOptions = getOptions(options);
            return <Observable<Object>>HttpClient.prototype.put.apply(http, [url, body, newOptions]);
        },

        post: (url: string, body: any, options?: Options) => {
            let newOptions = getOptions(options);
            return <Observable<Object>>HttpClient.prototype.post.apply(http, [url, body, newOptions]);
        },

        patch: (url: string, body: any, options?: Options) => {
            let newOptions = getOptions(options);
            return <Observable<Object>>HttpClient.prototype.patch.apply(http, [url, body, newOptions]);
        },

        delete: (url: string, options?: Options) => {
            let newOptions = getOptions(options);
            return <Observable<Object>>HttpClient.prototype.delete.apply(http, [url, newOptions]);
        }
    };
}
