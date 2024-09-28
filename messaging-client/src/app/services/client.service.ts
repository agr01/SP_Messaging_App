import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { Hello } from '../models/hello';
import { CryptoService } from './crypto.service';
import { combineLatestWith, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientService implements OnDestroy {

  private sendHelloSubscription!: Subscription;
  private messageRecievedSubscription!: Subscription;


  constructor(
    private webSocketService: WebSocketService,
    private cryptoService: CryptoService
  ) { 


    // Send the server hello message once both the connection is established and the 
    // RSA keys are generated
    this.sendHelloSubscription = 
    this.webSocketService.connectionIsOpen$.pipe(
      combineLatestWith(this.cryptoService.rsaKeysGenerated$)
    ).subscribe(
      ([webSocketOpen, rsaKeyGenerated]) =>{

        if (webSocketOpen && rsaKeyGenerated){
          console.log("Sending hello");
          this.SendServerHello();
        }

      }
    );

    this.messageRecievedSubscription = this.webSocketService.messageRecieved$.subscribe(
      (message: any) => {

      }
    );

  }

  ngOnDestroy(): void {
    this.sendHelloSubscription.unsubscribe();
    // this.messageRecievedSubscription.unsubscribe();
  }

  private async SendServerHello(){

    let helloData = {} as Hello;

    helloData.type = "hello";
    helloData.public_key = await this.cryptoService.getPublicKeyPem();

    console.log("Created hello data: ", helloData)

    this.webSocketService.sendAsData(helloData);
  }
}
