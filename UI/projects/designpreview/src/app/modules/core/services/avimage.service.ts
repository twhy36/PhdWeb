import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from 'rxjs';
import { withSpinner } from "phd-common";

@Injectable()
export class AVImageService
{
    constructor(private http: HttpClient) { }

    renderImage(sceneId: string, packageGuid: string, surfaces: Array<{surface: string, productGuid: string}>): Observable<string>
    {
        return withSpinner(this.http).post<any>('http://localhost:2845/odata/RenderImage',
        {
            'SceneID': sceneId,
            'PackageGUID': packageGuid,
            'Surfaces': surfaces.map(surface => ({
                'Surface': surface.surface,
                'ProductGUID': surface.productGuid
            }))
        });
    }
}