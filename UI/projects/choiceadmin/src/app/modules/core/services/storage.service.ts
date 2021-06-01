import { Injectable } from '@angular/core';

@Injectable()
export class StorageService
{
	private _webStorage: Storage;
	private _storageType: StorageType = 'localStorage';

	constructor() { }

	setStorageType(storageType: StorageType)
	{
		this._webStorage = window[storageType];
	}

	public getLocal<T>(key: string): T
	{
		this.setStorageType('localStorage');

		return this.get<T>(key);
	}

	public getSession<T>(key: string): T
	{
		this.setStorageType('sessionStorage');

		return this.get<T>(key);
	}

	private get<T>(key: string): T
	{
		let retVal: T;
		let item = this._webStorage ? this._webStorage.getItem(key) : '';

		try
		{
			retVal = JSON.parse(item);
		}
		catch (err)
		{
			//retVal = '';
		}

		return retVal;
	}

	public setLocal(key: string, value: any): boolean
	{
		this.setStorageType('localStorage');

		return this.set(key, value);
	}

	public setSession(key: string, value: any): boolean
	{
		this.setStorageType('sessionStorage');

		return this.set(key, value);
	}

	private set(key: string, value: any): boolean
	{
		let retVal = true;

		if (value != null)
		{
			value = JSON.stringify(value);
		}

		try
		{
			if (this._webStorage)
			{
				this._webStorage.setItem(key, value);
			}
		}
		catch (err)
		{
			retVal = false;
		}

		return retVal;
	}

	remove(keys: Array<string>): boolean
	{
		let retVal = true;

		keys.forEach(key =>
		{
			try
			{
				this._webStorage.removeItem(key);
			}
			catch (err)
			{
				retVal = false;
			}
		});

		return retVal;
	}
}

type StorageType = 'sessionStorage' | 'localStorage';
