import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import 'rxjs/add/operator/delay';

@Injectable()
export class DataResolver implements Resolve<Observable<any>> {
  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    console.warn('resolve data being fetched... please wait...');
    return of({ resolve: 'I am data from the resolve'}).delay(5000);
  }
}

/**
 * An array of services to resolve routes with data.
 */
export const APP_RESOLVER_PROVIDERS = [
  DataResolver
];
