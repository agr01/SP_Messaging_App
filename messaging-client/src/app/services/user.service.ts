// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { BehaviorSubject, filter, takeWhile } from 'rxjs';

// Manages data about the client using the application - the "user"

@Injectable({
  providedIn: 'root'
})
export class UserService{

  private userFignerprint: string | undefined
  private userPublicKeyPem: string | undefined

  private _userReadySubject = new BehaviorSubject<boolean>(false)
  public readonly userReady$ = this._userReadySubject.asObservable();


  constructor(
    private cryptoService: CryptoService
  ) { 

    // Generate user fingerprint once the keys are generated
    // Listen until generated is true, then unsubscribe
   this.cryptoService.rsaKeysGenerated$
    .pipe(
      takeWhile(generated => generated == false, true),
      filter(value => value === true)
    ).subscribe(
    async (generated)=>{
      this.userFignerprint = await this.cryptoService.generateUserFingerprint();
      this.userPublicKeyPem = await this.cryptoService.generateUserPublicKeyPem();
      this._userReadySubject.next(true);
    })

  }


  public getUserFingerprint(): string{
    if (!this.userFignerprint) throw new Error("Could not get user fingerprint");
    return this.userFignerprint;
  }

  public getUserPublicKeyPem(): string{
    if (!this.userPublicKeyPem) throw new Error("Could not get user public key");
    return this.userPublicKeyPem;
  }
}
